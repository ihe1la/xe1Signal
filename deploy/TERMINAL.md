# Owner root terminal (WebSocket)

The Tools → Terminal tab opens a **root** shell on the VPS over HTTPS so you do not need V2Ray TUN for SSH.

## Pieces

- Ticket API: `POST /api/terminal/ticket` (owner `ihe1la` only)
- PTY bridge: `server/terminal-ws.mjs` on `127.0.0.1:3010`
- Systemd: `deploy/xe1signal-terminal.service`

## Nginx

Inside the `he1l.me` server block:

```nginx
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
```

## Install service

```bash
cp /home/hela/xe1signal/deploy/xe1signal-terminal.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now xe1signal-terminal.service
```

Requires `NEXTAUTH_SECRET` in `.env.production` (same as the app).
