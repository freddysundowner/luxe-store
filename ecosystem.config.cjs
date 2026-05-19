/**
 * PM2 ecosystem file for Luxe Store.
 *
 * Usage (after install.sh has built everything and written .env.production):
 *   sudo npm i -g pm2          # one-time
 *   pm2 start ecosystem.config.cjs --env production
 *   pm2 save
 *   pm2 startup systemd        # follow the printed command to enable boot start
 *
 * Common commands:
 *   pm2 status
 *   pm2 logs luxe-api
 *   pm2 logs luxe-shop
 *   pm2 restart all
 *   pm2 reload all             # zero-downtime reload (cluster mode only)
 *   pm2 stop all
 *
 * The .cjs extension is required because every package.json in this monorepo
 * is `"type": "module"`, and PM2 still uses CommonJS `require()` to load the
 * ecosystem file.
 */
const path = require("path");

const REPO_DIR = __dirname;
const ENV_FILE = path.join(REPO_DIR, ".env.production");

// Helper: read .env.production into a plain object so PM2 picks up the same
// values that install.sh wrote (DATABASE_URL, INTERNAL_API_URL, AI keys, …).
// PM2 does not source EnvironmentFile-style files on its own.
function loadDotEnv(file) {
  const fs = require("fs");
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const raw of fs.readFileSync(file, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const env = loadDotEnv(ENV_FILE);

// Defaults — overridden by anything in .env.production
const API_PORT  = env.API_PORT  || process.env.API_PORT  || "8080";
const SHOP_PORT = env.SHOP_PORT || process.env.SHOP_PORT || "3000";

module.exports = {
  apps: [
    {
      name: "luxe-api",
      cwd: path.join(REPO_DIR, "artifacts/api-server"),
      script: "./dist/index.mjs",
      interpreter: "node",
      interpreter_args: "--enable-source-maps",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      max_memory_restart: "512M",
      kill_timeout: 5000,
      wait_ready: false,
      env: {
        ...env,
        NODE_ENV: "production",
        PORT: API_PORT,
      },
      env_production: {
        ...env,
        NODE_ENV: "production",
        PORT: API_PORT,
      },
      out_file: path.join(REPO_DIR, ".local/logs/luxe-api.out.log"),
      error_file: path.join(REPO_DIR, ".local/logs/luxe-api.err.log"),
      merge_logs: true,
      time: true,
    },
    {
      name: "luxe-shop",
      cwd: path.join(REPO_DIR, "artifacts/shop"),
      // ssr-server.ts is not transpiled by the build, so we run it through
      // tsx (which @workspace/shop has as a devDep).
      script: path.join(REPO_DIR, "node_modules/.bin/tsx"),
      args: "./ssr-server.ts",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      max_memory_restart: "768M",
      kill_timeout: 5000,
      env: {
        ...env,
        NODE_ENV: "production",
        PORT: SHOP_PORT,
        // The SSR server proxies /api/* to the API. If install.sh chose a
        // non-default API port, it gets written into .env.production and
        // loaded above; this just makes the link explicit.
        INTERNAL_API_URL: env.INTERNAL_API_URL || `http://127.0.0.1:${API_PORT}`,
      },
      env_production: {
        ...env,
        NODE_ENV: "production",
        PORT: SHOP_PORT,
        INTERNAL_API_URL: env.INTERNAL_API_URL || `http://127.0.0.1:${API_PORT}`,
      },
      out_file: path.join(REPO_DIR, ".local/logs/luxe-shop.out.log"),
      error_file: path.join(REPO_DIR, ".local/logs/luxe-shop.err.log"),
      merge_logs: true,
      time: true,
    },
  ],
};
