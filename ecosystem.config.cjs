/**
 * ecosystem.config.cjs — PM2 config สำหรับ VPS
 * รัน: pm2 start ecosystem.config.cjs
 */
module.exports = {
  apps: [
    {
      name: "line-dashboard-api",
      script: "node",
      args: "--enable-source-maps ./dist/index.mjs",
      cwd: "/app/artifacts/api-server",
      env: {
        NODE_ENV: "production",
        PORT: "8080",
        CHROME_PROFILE_DIR: "/root/.line-chrome-profile",
        DISCORD_WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL || "",
        CHECK_INTERVAL: "60",
        BACKUP_SCAN_INTERVAL: "300",
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      error_file: "/app/logs/line-dashboard-error.log",
      out_file: "/app/logs/line-dashboard-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
