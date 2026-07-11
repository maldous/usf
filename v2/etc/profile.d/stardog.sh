# Stardog CLI environment (token-free). Connection details are sourced from /usf/.env
# (git-ignored); see /usf/.env.example. Never hardcode credentials here.
export STARDOG_HOME="${STARDOG_HOME:-/var/opt/stardog}"
export PATH="/opt/stardog-12.1.1/bin:$PATH"
[ -f /usf/.env ] && { set -a; . /usf/.env; set +a; }
