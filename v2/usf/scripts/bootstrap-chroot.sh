#!/usr/bin/env bash
# Bootstrap the repository chroot for reproducible USF graph/compiler work.
#
# Stardog access is exclusively through the official JavaScript SDK installed
# from compiler/package-lock.json. No Stardog CLI, raw HTTP client, or local
# Stardog server is installed or invoked.
set -euo pipefail

NODE_VERSION="22.23.1"
NODE_SHA256="9749e988f437343b7fa832c69ded82a312e41a03116d766797ac14f6f9eee578"
NODE_DIR="/opt/node-v${NODE_VERSION}-linux-x64"
NODE_ARCHIVE="/opt/node-v${NODE_VERSION}-linux-x64.tar.xz"
NODE_URL="https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz"
VENV_DIR="/usf/.venv"
PY_DEPS=("rdflib==7.6.0" "pyshacl==0.40.0" "pyyaml==6.0.3")

log(){ printf '\n== %s ==\n' "$*"; }
have(){ command -v "$1" >/dev/null 2>&1; }
ensure_dns(){
  if [ ! -s /etc/resolv.conf ] || ! grep -q nameserver /etc/resolv.conf 2>/dev/null; then
    echo "nameserver 1.1.1.1" > /etc/resolv.conf
  fi
}

[ "$(id -u)" -eq 0 ] || { echo "error: run as root inside the chroot" >&2; exit 1; }
[ -d /usf/compiler ] || { echo "error: /usf/compiler is missing" >&2; exit 1; }

log "OS prerequisites"
need=()
have curl || need+=(curl)
have xz || need+=(xz-utils)
[ -e /etc/ssl/certs/ca-certificates.crt ] || need+=(ca-certificates)
have python3 || need+=(python3)
python3 -c 'import venv' 2>/dev/null || need+=(python3-venv)
python3 -c 'import ensurepip' 2>/dev/null || need+=(python3-pip)
if [ "${#need[@]}" -gt 0 ]; then
  ensure_dns
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y --no-install-recommends "${need[@]}"
  update-ca-certificates 2>/dev/null || true
else
  echo "present: curl xz ca-certificates python3 venv pip"
fi

log "Node.js ${NODE_VERSION}"
if [ ! -x "${NODE_DIR}/bin/node" ]; then
  if [ ! -f "${NODE_ARCHIVE}" ]; then
    ensure_dns
    curl -fSL --retry 3 -o "${NODE_ARCHIVE}" "${NODE_URL}"
  fi
  printf '%s  %s\n' "${NODE_SHA256}" "${NODE_ARCHIVE}" | sha256sum -c -
  rm -rf "${NODE_DIR}"
  tar -xJf "${NODE_ARCHIVE}" -C /opt
fi
ln -sf "${NODE_DIR}/bin/node" /usr/local/bin/node
ln -sf "${NODE_DIR}/bin/npm" /usr/local/bin/npm
ln -sf "${NODE_DIR}/bin/npx" /usr/local/bin/npx
cat > /etc/profile.d/node.sh <<EOF
export PATH="${NODE_DIR}/bin:\$PATH"
EOF
export PATH="${NODE_DIR}/bin:$PATH"
node --version
npm --version

log "Pinned Python RDF toolchain"
[ -x "${VENV_DIR}/bin/python" ] || python3 -m venv "${VENV_DIR}"
"${VENV_DIR}/bin/pip" install --quiet --upgrade pip
"${VENV_DIR}/bin/pip" install --quiet "${PY_DEPS[@]}"
"${VENV_DIR}/bin/python" -c 'import rdflib, pyshacl, yaml; print(rdflib.__version__, pyshacl.__version__, yaml.__version__)'

log "Frozen compiler dependencies"
(cd /usf/compiler && npm ci --ignore-scripts)
(cd /usf/compiler && node -e 'import("stardog").then(() => console.log("official Stardog SDK import: OK"))')

log "readiness"
[ -x /usr/local/bin/node ] || { echo "MISSING node" >&2; exit 1; }
[ -x "${VENV_DIR}/bin/python" ] || { echo "MISSING venv" >&2; exit 1; }
[ -d /usf/compiler/node_modules/stardog ] || { echo "MISSING official Stardog SDK" >&2; exit 1; }
echo "USF chroot bootstrap complete"
