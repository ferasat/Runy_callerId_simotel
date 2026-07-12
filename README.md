# Simotel Desktop Softphone

Production-ready Electron + React CTI softphone for **Simotel** call centers.

## Features

- Caller ID popup (number, name, company, queue, avatar)
- Answer / Reject / Mute / Transfer
- Click-to-call via Simotel `call/originate/act`
- Local contacts (CSV import/export, favorites, tags, notes, groups)
- Queue management (join / leave / pause / resume, waiting callers)
- Call history with pagination, filtering, sorting, export
- Recordings browser (play / download when Simotel provides audio)
- Agent status (Ready, Busy, Break, Lunch, Meeting, ACW, Offline, Custom)
- Realtime engine with protocol auto-detection (WebSocket → SSE → polling)
- System tray, desktop notifications, auto-update, offline queue, SQLite cache

## Architecture

```
electron/main     Native process: SQLite, IPC, tray, updater, Simotel API, realtime
electron/preload  Context-isolated bridge (`window.simotel`)
src/              React renderer (dashboard, contacts, queues, history, settings)
shared/           Types & IPC channel constants shared by both processes
```

API layer (renderer): **DTO → Validation (Zod) → Repository → Service → UI**

## Stack

| Layer | Tech |
|-------|------|
| Desktop | Electron 34 |
| UI | React 19 + TypeScript + Vite |
| State | Zustand |
| DB | better-sqlite3 (WAL) |
| Validation | Zod |
| Packaging | electron-builder (NSIS + portable) |
| Tests | Vitest |

## Quick start

```bash
npm install
npm run dev
```

### Build

```bash
npm run build
npm run dist:win        # NSIS installer
npm run dist:portable   # Portable EXE
```

### Test

```bash
npm test
```

## Configure a Simotel server

1. Open the app → **Server** form
2. Base URL: `https://your-pbx.example.com`
3. API path: `api/v4`
4. API key: from Simotel admin (`X-APIKEY`)
5. **Test & Save**, then login with your extension

## Environments

| File | Purpose |
|------|---------|
| `.env.development` | Local Electron + Vite HMR |
| `.env.testing` | Automated tests |
| `.env.production` | Packaged builds |

## Documentation

- [Deployment Guide](docs/guides/DEPLOYMENT.md)
- [Developer Documentation](docs/guides/DEVELOPER.md)
- [API Documentation](docs/guides/API.md)
- Simotel Postman collection: `docs/Simotel_V4_edition_3.postman_collection.json`

## License

MIT
