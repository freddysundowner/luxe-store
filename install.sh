#!/usr/bin/env bash
# =============================================================================
#  Luxe Store — one-shot installer for luxestores.shop
# -----------------------------------------------------------------------------
#  Usage:  sudo bash install.sh
#  Target: Ubuntu 22.04 / 24.04 (Debian 12 should also work)
#  Run from the cloned repo root (the directory containing pnpm-workspace.yaml).
#
#  Idempotent: re-running the script will skip anything already in place
#  (system packages, the database, the seed) and only update the app code,
#  rebuild it, and restart the services.
# =============================================================================
set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────
DOMAIN="luxestores.shop"
WWW_DOMAIN="www.luxestores.shop"
LE_EMAIL="admin@luxestores.shop"

DB_NAME="luxestore"
DB_USER="luxestore"

API_PORT=8080
SHOP_PORT=3000

APP_USER="${SUDO_USER:-$(whoami)}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${REPO_DIR}/.env.production"
SEED_MARKER="${REPO_DIR}/.local/.seeded"

# ── Helpers ──────────────────────────────────────────────────────────────────
log()  { printf "\033[1;34m[+] %s\033[0m\n" "$*"; }
warn() { printf "\033[1;33m[!] %s\033[0m\n" "$*"; }
die()  { printf "\033[1;31m[x] %s\033[0m\n" "$*" >&2; exit 1; }
have() { command -v "$1" >/dev/null 2>&1; }

[[ $EUID -eq 0 ]] || die "Please run with sudo:  sudo bash install.sh"
[[ -f "${REPO_DIR}/pnpm-workspace.yaml" ]] || die "Run this script from the repo root (pnpm-workspace.yaml not found)."

mkdir -p "${REPO_DIR}/.local"

# ── Pick a free TCP port ─────────────────────────────────────────────────────
# Tries the preferred port first; if taken, walks upward until it finds a free
# one (or our own systemd unit already on it, which we treat as free so re-runs
# don't keep hopping ports). Uses `ss` (always available on modern Ubuntu).
port_in_use() {
  ss -H -ltn "sport = :$1" 2>/dev/null | grep -q .
}
pick_port() {
  local preferred="$1" service_unit="$2" port="$1"
  if port_in_use "$port"; then
    # If our own service is the one holding the port, keep it.
    if systemctl is-active --quiet "$service_unit" 2>/dev/null \
       && ss -H -ltnp "sport = :$port" 2>/dev/null | grep -q "${service_unit%.service}\|node"; then
      echo "$port"; return 0
    fi
    warn "Port ${preferred} is already in use — searching for a free one…" >&2
    port=$((preferred + 1))
    while (( port < preferred + 200 )); do
      port_in_use "$port" || { echo "$port"; return 0; }
      port=$((port + 1))
    done
    die "Could not find a free port in range ${preferred}–$((preferred+199))."
  fi
  echo "$port"
}

# Make sure `ss` exists before we use it
have ss || apt-get install -y iproute2 >/dev/null

API_PORT="$(pick_port "$API_PORT"  "luxe-api.service")"
SHOP_PORT="$(pick_port "$SHOP_PORT" "luxe-shop.service")"
log "Using API port ${API_PORT} and shop port ${SHOP_PORT}."

# ── 1. System packages ──────────────────────────────────────────────────────
log "Updating apt and installing system prerequisites…"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y --no-install-recommends \
  curl ca-certificates gnupg lsb-release git build-essential \
  nginx ufw openssl jq

# Node.js 20 LTS via NodeSource
if ! have node || [[ "$(node -v | cut -dv -f2 | cut -d. -f1)" -lt 20 ]]; then
  log "Installing Node.js 20 LTS…"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
else
  log "Node.js $(node -v) already installed."
fi

# pnpm via corepack
if ! have pnpm; then
  log "Enabling pnpm via corepack…"
  corepack enable
  corepack prepare pnpm@latest --activate
else
  log "pnpm $(pnpm -v) already installed."
fi

# Certbot for SSL
if ! have certbot; then
  log "Installing certbot + nginx plugin…"
  apt-get install -y certbot python3-certbot-nginx
else
  log "certbot already installed."
fi

# ── 2. PostgreSQL ───────────────────────────────────────────────────────────
if have psql && systemctl is-active --quiet postgresql 2>/dev/null; then
  log "PostgreSQL already installed and running — skipping install."
else
  log "Installing PostgreSQL…"
  apt-get install -y postgresql postgresql-contrib
  systemctl enable --now postgresql
fi

# Check / create database + role
DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" || true)
if [[ "$DB_EXISTS" == "1" ]]; then
  log "Database '${DB_NAME}' already exists — keeping current data."
  RUN_PUSH=true   # still apply any new schema changes via drizzle push
else
  log "Creating database '${DB_NAME}' and role '${DB_USER}'…"
  DB_PASSWORD="$(openssl rand -hex 24)"
  sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASSWORD}';
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
SQL
  RUN_PUSH=true
  NEW_DB=true
fi

# ── 3. .env.production ──────────────────────────────────────────────────────
if [[ ! -f "$ENV_FILE" ]]; then
  log "Creating ${ENV_FILE}…"
  if [[ -z "${DB_PASSWORD:-}" ]]; then
    # DB already existed but we have no password — generate a new one and reset
    DB_PASSWORD="$(openssl rand -hex 24)"
    log "Resetting password for existing role '${DB_USER}'…"
    sudo -u postgres psql -c "ALTER ROLE ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';"
  fi
  cat > "$ENV_FILE" <<ENV
# Generated by install.sh on $(date -Iseconds)
NODE_ENV="production"
DATABASE_URL="postgres://${DB_USER}:${DB_PASSWORD}@127.0.0.1:5432/${DB_NAME}"

# Public site
SITE_URL="https://${DOMAIN}"
BASE_PATH="/"

# Internal wiring (shop SSR proxies /api/* to the api-server)
INTERNAL_API_URL="http://127.0.0.1:${API_PORT}"

# Ports chosen by install.sh (may differ from the defaults if 8080/3000 were busy)
API_PORT="${API_PORT}"
SHOP_PORT="${SHOP_PORT}"

# Admin password for the /admin login (change this!)
ADMIN_PASSWORD="admin123"

# Log verbosity for the API server (trace|debug|info|warn|error)
LOG_LEVEL="info"

# --- AI Concierge -----------------------------------------------------------
# Fill in ONE of these. ANTHROPIC_API_KEY is what the code reads.
# Leave blank to disable the AI gift advisor entirely.
ANTHROPIC_API_KEY=""

# NOTE: Brevo (email), SunPay (M-Pesa) and the WhatsApp number are configured
# from the admin Settings page in the shop — they are stored in the database,
# not here. No need to set them in this file.
ENV
  chown "${APP_USER}:${APP_USER}" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  log "Wrote ${ENV_FILE} (chmod 600). DB password stored inside."
else
  log "${ENV_FILE} already present — leaving it untouched."
fi

# Load env into this shell for the build/seed steps
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

# ── 4. Install + build the app ──────────────────────────────────────────────
log "Installing workspace dependencies (this can take a few minutes)…"
sudo -u "$APP_USER" -H bash -lc "cd '$REPO_DIR' && pnpm install --frozen-lockfile || pnpm install"

log "Building production artifacts (api-server + shop)…"
# Note: we deliberately skip @workspace/mockup-sandbox — it's a dev-only
# Canvas preview tool that requires PORT at build time and isn't deployed.
sudo -u "$APP_USER" -H bash -lc \
  "cd '$REPO_DIR' && pnpm --filter @workspace/api-server --filter @workspace/shop run build"

# ── 5. Drizzle push (schema sync) ───────────────────────────────────────────
if [[ "${RUN_PUSH:-false}" == "true" ]]; then
  log "Applying database schema with drizzle push…"
  sudo -u "$APP_USER" -H bash -lc \
    "cd '$REPO_DIR' && DATABASE_URL='${DATABASE_URL}' pnpm --filter @workspace/db run push"
fi

# ── 6. Seed (only if marker absent) ─────────────────────────────────────────
if [[ -f "$SEED_MARKER" ]]; then
  log "Seed marker found (${SEED_MARKER}) — skipping seed."
else
  log "Running seed (idempotent — won't overwrite existing products)…"
  sudo -u "$APP_USER" -H bash -lc \
    "cd '$REPO_DIR' && DATABASE_URL='${DATABASE_URL}' pnpm --filter @workspace/db exec tsx scripts/seed.ts"
  touch "$SEED_MARKER"
  chown "${APP_USER}:${APP_USER}" "$SEED_MARKER"
  log "Seed complete, marker written to ${SEED_MARKER}."
fi

# ── 7. systemd services ─────────────────────────────────────────────────────
log "Writing systemd units for the API server and the shop SSR server…"

cat > /etc/systemd/system/luxe-api.service <<UNIT
[Unit]
Description=Luxe Store — API server
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${REPO_DIR}/artifacts/api-server
EnvironmentFile=${ENV_FILE}
Environment=PORT=${API_PORT}
ExecStart=/usr/bin/node --enable-source-maps ./dist/index.mjs
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
UNIT

cat > /etc/systemd/system/luxe-shop.service <<UNIT
[Unit]
Description=Luxe Store — shop SSR server
After=network.target luxe-api.service
Requires=luxe-api.service

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${REPO_DIR}/artifacts/shop
EnvironmentFile=${ENV_FILE}
Environment=PORT=${SHOP_PORT}
Environment=NODE_ENV=production
# ssr-server is written in TypeScript and not transpiled by `pnpm build`,
# so we run it directly via tsx (installed as a devDep of @workspace/shop).
# pnpm places tsx in the package-local node_modules, not the workspace root.
ExecStart=${REPO_DIR}/artifacts/shop/node_modules/.bin/tsx ./ssr-server.ts
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable luxe-api.service luxe-shop.service
systemctl restart luxe-api.service
sleep 2
systemctl restart luxe-shop.service

# ── 8. Nginx vhost (HTTP first, certbot will add HTTPS) ─────────────────────
log "Writing nginx vhost for ${DOMAIN}…"
cat > /etc/nginx/sites-available/luxestores.shop <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} ${WWW_DOMAIN};

    client_max_body_size 10M;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;
    gzip_min_length 1024;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # API → api-server
    location /api/ {
        proxy_pass http://127.0.0.1:${API_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 90s;
    }

    # Everything else → shop SSR server
    location / {
        proxy_pass http://127.0.0.1:${SHOP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 90s;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/luxestores.shop /etc/nginx/sites-enabled/luxestores.shop
# Remove the default vhost so it doesn't shadow ours
[[ -e /etc/nginx/sites-enabled/default ]] && rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl reload nginx

# ── 9. Firewall ─────────────────────────────────────────────────────────────
if have ufw; then
  log "Configuring ufw (22, 80, 443)…"
  ufw allow OpenSSH    >/dev/null 2>&1 || true
  ufw allow 'Nginx Full' >/dev/null 2>&1 || true
  ufw --force enable   >/dev/null 2>&1 || true
fi

# ── 10. SSL via Let's Encrypt ───────────────────────────────────────────────
log "Requesting Let's Encrypt certificate for ${DOMAIN} and ${WWW_DOMAIN}…"
if certbot certificates 2>/dev/null | grep -q "Domains: .*${DOMAIN}"; then
  log "Certificate for ${DOMAIN} already exists — running renew/expand if needed."
  certbot --nginx \
    -d "${DOMAIN}" -d "${WWW_DOMAIN}" \
    --non-interactive --agree-tos --redirect --expand \
    -m "${LE_EMAIL}" || warn "certbot expand failed (DNS may not yet point at this server)."
else
  certbot --nginx \
    -d "${DOMAIN}" -d "${WWW_DOMAIN}" \
    --non-interactive --agree-tos --redirect \
    -m "${LE_EMAIL}" \
    || warn "certbot failed. Make sure DNS for ${DOMAIN} and ${WWW_DOMAIN} points at this server, then re-run: sudo certbot --nginx -d ${DOMAIN} -d ${WWW_DOMAIN} --redirect -m ${LE_EMAIL} --agree-tos"
fi

systemctl reload nginx || true

# ── 11. Summary ─────────────────────────────────────────────────────────────
echo
echo "============================================================"
echo " Luxe Store install complete"
echo "============================================================"
echo " Site            : https://${DOMAIN}"
echo " API (internal)  : http://127.0.0.1:${API_PORT}"
echo " Shop (internal) : http://127.0.0.1:${SHOP_PORT}"
echo " Database        : ${DB_NAME} (user: ${DB_USER})"
echo " Env file        : ${ENV_FILE}"
echo " Seed marker     : ${SEED_MARKER}"
echo
echo " Services:"
echo "   systemctl status luxe-api"
echo "   systemctl status luxe-shop"
echo "   journalctl -u luxe-api -f"
echo "   journalctl -u luxe-shop -f"
echo
if [[ "${NEW_DB:-false}" == "true" ]]; then
  echo " A fresh database password was generated and written to"
  echo " ${ENV_FILE} (chmod 600). Keep that file safe."
fi
echo
echo " Next steps:"
echo "   1. Edit ${ENV_FILE} and fill in M-Pesa / WhatsApp / Brevo / AI keys."
echo "   2. sudo systemctl restart luxe-api luxe-shop"
echo "   3. Visit https://${DOMAIN}"
echo "============================================================"
