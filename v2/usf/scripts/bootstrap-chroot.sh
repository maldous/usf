#!/usr/bin/env bash
# Bootstrap a base Debian chroot into a USF graph-provisioning environment.
#
# Installs everything that is NOT part of a minimal debootstrap: OS prerequisites
# (curl, unzip, ca-certificates, python3 + venv + pip), the Temurin JRE 21, the Stardog CLI
# (symlinked into /usr/local/bin), STARDOG_HOME, profile.d wiring, and a Python venv with the
# RDF toolchain (rdflib, pyshacl, pyyaml). Idempotent: each component is skipped when present,
# installed from a local archive under /opt when available, and downloaded otherwise.
#
# Run INSIDE the chroot:  sudo chroot v2 /bin/bash /usf/scripts/bootstrap-chroot.sh
#
# Credentials are NEVER written by this script. Stardog connection details (STARDOG_SERVER,
# STARDOG_DATABASE, STARDOG_TOKEN or STARDOG_USERNAME/PASSWORD) live in /usf/.env (git-ignored);
# copy /usf/.env.example to /usf/.env and fill it in before provisioning.
set -euo pipefail

# ---- pinned versions (bump here) -------------------------------------------------------
JAVA_DIR="/opt/jdk-21.0.11+10-jre"
JAVA_ARCHIVE="/opt/temurin21.tar.gz"
JAVA_URL="https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.11%2B10/OpenJDK21U-jre_x64_linux_hotspot_21.0.11_10.tar.gz"
STARDOG_DIR="/opt/stardog-12.1.1"
STARDOG_ARCHIVE="/opt/stardog-latest.zip"
STARDOG_URL="https://downloads.stardog.com/stardog/stardog-latest.zip"  # public; currently 12.1.1
STARDOG_HOME_DIR="/var/opt/stardog"
VENV_DIR="/usf/.venv"
PY_DEPS=(rdflib pyshacl pyyaml)
# ---------------------------------------------------------------------------------------

log(){ printf '\n== %s ==\n' "$*"; }
have(){ command -v "$1" >/dev/null 2>&1; }

[ "$(id -u)" -eq 0 ] || { echo "error: run as root inside the chroot" >&2; exit 1; }
[ -x /bin/bash ] || { echo "error: no base rootfs — create a Debian chroot (debootstrap) first" >&2; exit 1; }

ensure_dns(){ # a download is about to happen; make sure DNS resolves
  if [ ! -s /etc/resolv.conf ] || ! grep -q nameserver /etc/resolv.conf 2>/dev/null; then
    echo "nameserver 1.1.1.1" > /etc/resolv.conf
  fi
}

log "OS prerequisites beyond minbase (curl, unzip, ca-certificates, python3, venv, pip)"
need=()
have curl  || need+=(curl)
have unzip || need+=(unzip)
[ -e /etc/ssl/certs/ca-certificates.crt ] || need+=(ca-certificates)
have python3 || need+=(python3)
python3 -c 'import venv'      2>/dev/null || need+=(python3-venv)
python3 -c 'import ensurepip' 2>/dev/null || need+=(python3-pip)
if [ "${#need[@]}" -gt 0 ]; then
  if have apt-get; then
    ensure_dns; export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq
    apt-get install -y --no-install-recommends "${need[@]}"
    update-ca-certificates 2>/dev/null || true
  else
    echo "error: missing ${need[*]} and no apt-get available" >&2; exit 1
  fi
else
  echo "present: curl unzip ca-certificates python3 venv pip"
fi

fetch(){ echo "downloading $1"; ensure_dns; curl -fSL --retry 3 -o "$2" "$1"; }

log "Temurin JRE 21"
if [ -x "$JAVA_DIR/bin/java" ]; then echo "present: $JAVA_DIR"; else
  [ -f "$JAVA_ARCHIVE" ] || fetch "$JAVA_URL" "$JAVA_ARCHIVE"
  tmp="$(mktemp -d)"; tar -xzf "$JAVA_ARCHIVE" -C "$tmp"
  src="$(find "$tmp" -maxdepth 1 -type d -name 'jdk-21*')"
  [ -n "$src" ] || { echo "error: JRE not found in archive" >&2; exit 1; }
  rm -rf "$JAVA_DIR"; mv "$src" "$JAVA_DIR"; rm -rf "$tmp"
fi
printf 'export JAVA_HOME="%s"\nexport PATH="$JAVA_HOME/bin:$PATH"\n' "$JAVA_DIR" > /etc/profile.d/java.sh
export JAVA_HOME="$JAVA_DIR"; export PATH="$JAVA_HOME/bin:$PATH"
java -version

log "Stardog CLI 12.1.1"
if [ -x "$STARDOG_DIR/bin/stardog" ]; then echo "present: $STARDOG_DIR"; else
  [ -f "$STARDOG_ARCHIVE" ] || fetch "$STARDOG_URL" "$STARDOG_ARCHIVE"
  tmp="$(mktemp -d)"; unzip -q "$STARDOG_ARCHIVE" -d "$tmp"
  src="$(find "$tmp" -maxdepth 1 -type d -name 'stardog-*')"
  [ -n "$src" ] || { echo "error: stardog dir not found in archive" >&2; exit 1; }
  rm -rf "$STARDOG_DIR"; mv "$src" "$STARDOG_DIR"; rm -rf "$tmp"
fi
ln -sf "$STARDOG_DIR/bin/stardog"       /usr/local/bin/stardog
ln -sf "$STARDOG_DIR/bin/stardog-admin" /usr/local/bin/stardog-admin
mkdir -p "$STARDOG_HOME_DIR"
# profile.d wiring only — no secrets; connection details come from /usf/.env.
cat > /etc/profile.d/stardog.sh <<EOF
export STARDOG_HOME="\${STARDOG_HOME:-$STARDOG_HOME_DIR}"
export PATH="$STARDOG_DIR/bin:\$PATH"
[ -f /usf/.env ] && { set -a; . /usf/.env; set +a; }
EOF
export STARDOG_HOME="$STARDOG_HOME_DIR"
# The Stardog CLI has no --version flag; confirm it launches (JVM loads, help runs).
if stardog help >/dev/null 2>&1; then echo "stardog CLI launches ($STARDOG_DIR)"; else
  echo "warning: stardog CLI did not launch cleanly; check JAVA_HOME" >&2; fi

log "Python RDF toolchain venv ($VENV_DIR)"
[ -x "$VENV_DIR/bin/python" ] || python3 -m venv "$VENV_DIR"
"$VENV_DIR/bin/pip" install --quiet --upgrade pip
"$VENV_DIR/bin/pip" install --quiet "${PY_DEPS[@]}"
"$VENV_DIR/bin/python" -c "import rdflib,pyshacl,yaml;print('rdflib',rdflib.__version__,'| pyshacl',pyshacl.__version__,'| pyyaml ok')"

log "credentials"
if [ -f /usf/.env ]; then echo "found /usf/.env (git-ignored)"; else
  echo "no /usf/.env — copy /usf/.env.example to /usf/.env and fill STARDOG_* before provisioning"; fi

log "readiness check"
fail=0
[ -x "$JAVA_DIR/bin/java" ]        || { echo "MISSING java"; fail=1; }
[ -x /usr/local/bin/stardog ]      || { echo "MISSING stardog cli"; fail=1; }
[ -x /usr/local/bin/stardog-admin ]|| { echo "MISSING stardog-admin"; fail=1; }
[ -x "$VENV_DIR/bin/python" ]      || { echo "MISSING venv"; fail=1; }
[ "$fail" -eq 0 ] && echo "OK — chroot bootstrapped. Next: /usf/scripts/provision-graph.sh" || { echo "bootstrap incomplete" >&2; exit 1; }
