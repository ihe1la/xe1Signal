# Signal Archive

Signal Archive is a polished personal archive and discovery product built with Next.js 15, React 19, TypeScript, Tailwind CSS, Auth.js, Prisma, and a self-contained SQLite database.

## Local setup

Requirements: Node.js 20 or newer.

```bash
npm install
copy .env.example .env.local
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

Open `http://localhost:3000`. The app has no external database requirement; the SQLite file is created beneath `prisma/` and ignored by Git.

## Demo accounts

All demo accounts use the password `Archive!2026`.

| Account | Email |
| --- | --- |
| Hela | `hela@signal.local` |
| Test user | `test@signal.local` |

## Included flows

- Credentials registration, persistent sessions, logout, password reset tokens, role-aware server authorization, and protected routes.
- Signal create/read/update/delete with note, link, image, screenshot, code, song, voice, document, and file forms.
- Visibility and ghost expiration controls, secure link metadata retrieval, validated uploads, and protected downloads.
- Signal attachments support JPG, PNG, GIF, WebP, MP3, WAV, OGG, M4A, FLAC, PDF, TXT, Markdown, DOC, and DOCX files up to 10 MB, with image previews, audio playback, byte-level progress, and owner-managed removal.
- YouTube and Spotify Signals store canonical provider IDs and cached oEmbed metadata only. Feed cards contain no provider frames; one persistent global player lazily initializes the official YouTube or Spotify iframe API after Play. Provider media is never downloaded, proxied, converted, or hosted by Signal Archive.
- Frequencies, follows, saves, reactions, comments/replies, profiles, inbox messages, notifications, and moderation foundations.
- Grouped/debounced search, archive filters, research trails with draggable nodes, zoom, sharing state, and local autosave.
- Responsive desktop context panel, tablet layout, mobile search overlay, and bottom navigation.

## Validation

```bash
npm run type-check
npm run lint
npm test
npm run build
npm run test:e2e
```

The Playwright suite expects the development server on `http://127.0.0.1:3000` and covers the desktop Discover page, owner sign-in plus Signal create/view/edit, and the mobile navigation/search experience.

## Environment

Origins are configurable through `NEXT_PUBLIC_APP_URL`, `APP_ORIGIN`, `API_ORIGIN`, `FILE_ORIGIN`, and `PREVIEW_ORIGIN`. Change `AUTH_SECRET` before any shared deployment. `CRON_SECRET` protects the ghost cleanup endpoint.

## VPS file storage

Keep uploads and the SQLite database outside the application release directory so they survive deployments. For example:

```bash
sudo install -d -o signal-archive -g signal-archive /var/lib/signal-archive/uploads
```

Use production environment values similar to:

```dotenv
NEXT_PUBLIC_APP_URL="https://archive.example.com"
APP_ORIGIN="https://archive.example.com"
API_ORIGIN="https://archive.example.com"
FILE_ORIGIN="https://archive.example.com"
PREVIEW_ORIGIN="https://archive.example.com"
AUTH_URL="https://archive.example.com"
AUTH_TRUST_HOST="true"
AUTH_SECRET="replace-with-a-random-secret-of-at-least-32-characters"
DATABASE_URL="file:/var/lib/signal-archive/signal.db"
UPLOAD_DIR="/var/lib/signal-archive/uploads"
MAX_FILE_SIZE="10485760"
MAX_USERS="2"
```

The service user running Node.js must have read/write access to both `/var/lib/signal-archive/uploads` and the database directory. Back up both together.

For Nginx, allow a request body slightly larger than the application limit and preserve the forwarding headers:

```nginx
location / {
    client_max_body_size 11m;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_pass http://127.0.0.1:3000;
}
```

Files are served through the authorized `/api/files/...` route rather than directly from Nginx. This preserves private-Signal permissions and supports HTTP byte ranges for audio playback and seeking.
