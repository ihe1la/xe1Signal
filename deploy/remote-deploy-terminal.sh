#!/usr/bin/env bash
set -euo pipefail

ENV_BAK=/tmp/xe1signal.env.production.bak
APP=/home/hela/xe1signal

cp -a "$APP/.env.production" "$ENV_BAK"
sudo -u hela bash -lc "cd $APP && git fetch origin main && git reset --hard origin/main"
cp -a "$ENV_BAK" "$APP/.env.production"
chown -R hela:hela "$APP"

sudo -u hela bash -lc "cd $APP && npm ci --include=dev"
# Ensure native PTY addon is built (install scripts may be blocked by npm policy)
sudo -u hela bash -lc "cd $APP && npm rebuild node-pty"
sudo -u hela bash -lc "cd $APP && node -e \"require('node-pty'); console.log('node-pty ok')\""
sudo -u hela bash -lc "cd $APP && npm run db:generate && npm run build"

# Systemd unit for terminal WS
cp "$APP/deploy/xe1signal-terminal.service" /etc/systemd/system/xe1signal-terminal.service
systemctl daemon-reload
systemctl enable xe1signal-terminal.service
systemctl restart xe1signal-terminal.service
sleep 1
systemctl is-active xe1signal-terminal.service
curl -fsS http://127.0.0.1:3010/healthz

# Nginx WebSocket proxy (idempotent)
NGINX_SITE=/etc/nginx/sites-available/xe1signal
if ! grep -q 'location /ws/terminal' "$NGINX_SITE"; then
  python3 - <<'PY'
from pathlib import Path
path = Path("/etc/nginx/sites-available/xe1signal")
text = path.read_text()
snippet = """
    location /ws/terminal {
        proxy_pass http://127.0.0.1:3010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600s;
    }

"""
needle = "    location / {"
if needle not in text:
    raise SystemExit("could not find location / block")
if "location /ws/terminal" in text:
    print("nginx already has /ws/terminal")
else:
    path.write_text(text.replace(needle, snippet + needle, 1))
    print("inserted /ws/terminal location")
PY
  nginx -t
  systemctl reload nginx
else
  echo "nginx already has /ws/terminal"
fi

systemctl restart xe1signal.service
systemctl is-active xe1signal.service
echo DEPLOY_OK
