# Vibe Music Download Feature

Implementation guide for reproducing the shared music room on pinqued.top.

## Core design

The website owns the shared room, queue, controls, and browser player. Unstream owns provider resolution, YouTube extraction, cookies, bot-check handling, and finished audio files.

Do not reimplement yt-dlp or YouTube cookie handling inside the website. Do not use a YouTube iframe as the primary player.

~~~text
Browser /vibe
  -> website POST /api/vibe/queue
  -> Unstream POST /api/resolve
  -> Unstream POST /api/download
  -> poll /api/jobs/{jobId}
  -> website relay /api/vibe/queue/{id}/file
  -> native HTMLAudioElement
~~~

## Prerequisites

Website:

- Next.js server routes
- Prisma database
- Authentication middleware
- Native audio player provider
- systemd, Docker, or another process manager

Unstream:

- Signed-in browser cookies exported as Netscape cookies.txt
- YTDLP_REMOTE_COMPONENTS=ejs:github
- Deno available to yt-dlp
- bgutil pot-provider when required by the VPS IP

Never commit cookies.txt, production environment files, or secrets.

## Environment

Website .env.production:

~~~dotenv
DATABASE_URL="file:/var/lib/pinqued/pinqued.db"
UNSTREAM_API_URL="http://127.0.0.1:8020"
NEXT_PUBLIC_APP_URL="https://pinqued.top"
APP_ORIGIN="https://pinqued.top"
~~~

Use 127.0.0.1 only when Unstream runs on the same server. Otherwise use a private/VPN address.

## Unstream Docker configuration

Publish the API only to the local host:

~~~yaml
services:
  api:
    ports:
      - "127.0.0.1:8020:8000"
    environment:
      - YTDLP_REMOTE_COMPONENTS=ejs:github
      - YTDLP_COOKIEFILE=/app/cookies.txt
      - POT_PROVIDER_URL=http://pot-provider:4416
    volumes:
      - ./cookies.txt:/app/cookies.txt:ro
~~~

Configure the cookie file:

~~~bash
chown 1001:1001 /path/to/unstream/cookies.txt
chmod 600 /path/to/unstream/cookies.txt
~~~

Start and verify:

~~~bash
cd /path/to/unstream
docker compose config >/dev/null
docker compose up -d --force-recreate api
curl -fsS http://127.0.0.1:8020/health
~~~

Expected health response:

~~~json
{"status":"ok"}
~~~

Verify without printing secrets:

~~~bash
docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' unstream-api-1 \
  | grep -E '^(YTDLP_COOKIEFILE|YTDLP_REMOTE_COMPONENTS|POT_PROVIDER_URL)='
~~~

## Prisma data model

Use one global room with slug main:

~~~prisma
model VibeRoom {
  id            String          @id @default(cuid())
  slug          String          @unique
  currentItemId String?
  isPlaying     Boolean         @default(false)
  revision      Int             @default(0)
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
  queue         VibeQueueItem[]

  @@index([slug])
}

model VibeQueueItem {
  id              String   @id @default(cuid())
  roomId          String
  addedById       String
  position        Int
  unstreamJobId   String?
  unstreamTrackId String?
  title           String
  artists         String   @default("")
  cover           String?
  sourceUrl       String
  status          String   @default("resolving")
  error           String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  room    VibeRoom @relation(fields: [roomId], references: [id], onDelete: Cascade)
  addedBy User     @relation(fields: [addedById], references: [id], onDelete: Cascade)

  @@index([roomId, position])
  @@index([roomId, status])
  @@index([unstreamJobId])
}
~~~

Statuses:

~~~text
resolving -> downloading -> ready -> playing
                              \-> failed
~~~

For an existing Party implementation, create a preserving migration that renames old tables and indexes. Never reset production data.

## Unstream server helper

Keep downloader calls in one server-only module:

~~~ts
resolveUnstreamUrl(url)
startUnstreamDownload(url, trackIds, quality)
getUnstreamJob(jobId)
getUnstreamTrackFile(jobId, trackId, range)
~~~

API contracts:

~~~http
POST /api/resolve
Content-Type: application/json

{"url":"https://www.youtube.com/watch?v=..."}
~~~

~~~http
POST /api/download
Content-Type: application/json

{"url":"https://www.youtube.com/watch?v=...","track_ids":["..."],"quality":"192"}
~~~

~~~http
GET /api/jobs/{jobId}
GET /api/jobs/{jobId}/tracks/{trackId}/file
~~~

Validate response JSON with Zod or an equivalent runtime validator.

## Queue API

POST /api/vibe/queue accepts:

~~~json
{"url":"https://www.youtube.com/watch?v=..."}
~~~

The server:

1. Requires authentication.
2. Validates and normalizes YouTube, Spotify, or SoundCloud URLs.
3. Calls Unstream /api/resolve.
4. Creates queue rows with resolving status and metadata.
5. Calls Unstream /api/download with resolved track IDs.
6. Stores the job ID and marks rows downloading.
7. Polls the job in the background.
8. Marks finished rows ready.
9. Selects the first ready row as playing when the room is idle.
10. Publishes the new room state.

Other endpoints:

~~~text
GET    /api/vibe
POST   /api/vibe/control
DELETE /api/vibe/queue/{id}
GET    /api/vibe/events
GET    /api/vibe/queue/{id}/file
~~~

Controls are play, pause, skip, and clear. Controls must update the persisted room state so every browser observes the same state.

The SSE endpoint publishes room updates and polls about every three seconds as a backup. Send heartbeat comments so proxies keep the stream open:

~~~text
: heartbeat
~~~

## Native browser playback

When the room snapshot has a playable file URL, pass it to the existing audio provider:

~~~ts
playTrack({
  id: "vibe:" + item.id,
  title: item.title,
  artist: item.artists.join(", "),
  src: item.fileUrl,
  href: "/vibe",
  onToggle: function () {
    sendControl(isPlaying ? "pause" : "play", item.id);
  }
}, {
  autoplay: room.isPlaying,
  onEnded: function () {
    sendControl("skip", item.id);
  }
});
~~~

The file URL must be the authenticated website relay, not a YouTube embed. Forward HTTP range and audio content headers. Catch autoplay failures and show a one-click play message.

## Routes and navigation

Add the protected page:

~~~text
/vibe
~~~

Protect /vibe/:path* in middleware. Add Vibe to desktop and mobile navigation.

The Vibe page should provide:

- Music URL input
- Shared queue
- Now playing card
- Play, pause, skip, and clear controls
- Resolving, downloading, ready, playing, and failed statuses
- Native audio playback from the Unstream file relay

## Local validation

Start the configured Unstream instance:

~~~powershell
cd D:\cursor\unstream
.\start-local.ps1
~~~

Set the website URL:

~~~powershell
$env:UNSTREAM_API_URL="http://127.0.0.1:8020"
~~~

Run:

~~~bash
npm run db:generate
npm run db:deploy
npm test -- --run
npm run type-check
npm run lint
npm run build
~~~

The browser acceptance test should verify login, /vibe, a known-working YouTube URL, a 201 response from /api/vibe/queue, a finished file URL, an audio content type, native audio playback, and shared pause/play from two browser sessions.

## Production deployment on pinqued.top

Example systemd unit:

~~~ini
[Unit]
Description=pinqued.top web application
After=network.target

[Service]
Type=simple
User=pinqued
Group=pinqued
WorkingDirectory=/home/pinqued/pinqued
EnvironmentFile=/home/pinqued/pinqued/.env.production
ExecStart=/usr/bin/npm start -- -H 127.0.0.1 -p 3000
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
~~~

Deploy:

~~~bash
cd /home/pinqued/pinqued
git config --global --add safe.directory /home/pinqued/pinqued
git pull --ff-only origin main

sudo -u pinqued -H bash -lc '
set -e
cd /home/pinqued/pinqued
set -a
. ./.env.production
set +a
npm ci --include=dev
npm run db:generate
npm run db:deploy
npm run build
'

sudo systemctl restart pinqued.service
sudo systemctl --no-pager --full status pinqued.service
~~~

Load the production DATABASE_URL before db:deploy. Never run db:reset on the server.

## Nginx and SSE

~~~nginx
server {
    server_name pinqued.top www.pinqued.top;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location /api/vibe/events {
        proxy_pass http://127.0.0.1:3000;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 1h;
    }
}
~~~

## Smoke checks

~~~bash
curl -sS -D - -o /dev/null https://pinqued.top/vibe
curl -sS -D - -o /dev/null https://pinqued.top/api/vibe
~~~

Expected:

- /vibe returns a login redirect such as 307.
- /api/vibe returns 401 Unauthorized.
- Unstream health returns {"status":"ok"} from the website host.

Finally, test an authenticated browser session with a known-working YouTube URL. A green website build alone does not prove YouTube extraction.

## Common failures

503 from the queue API means production mode has no UNSTREAM_API_URL.

Connection refused on 8020 means Unstream is not running locally or the API container has no host port mapping.

YouTube resolving but download failing usually means the cookie file is missing, unreadable, expired, or not mounted inside the API container.

Browser audio not starting may be autoplay policy. Press play once, but keep the primary source as /api/vibe/queue/{id}/file.

Prisma migration failures usually mean the production DATABASE_URL was not loaded. Run db:generate, then db:deploy, and never reset production data.

