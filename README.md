# Simotel Softphone

Production-ready **Electron + React** CTI softphone for Simotel call centers.

Built against official references:

- [nasimtel/simotel-api-postman (local-simotel)](https://github.com/nasimtel/simotel-api-postman/tree/main/local-simotel)
- [nasimtel/simotel-laravel-connect](https://github.com/nasimtel/simotel-laravel-connect)

## Highlights

- Auth modes: **basic / token / both** (encrypted credential storage via `safeStorage`)
- Event API webhook listener + realtime fallback ladder (WS → SSE → polling)
- Admin / Agent roles, multi-server support, health indicators
- Caller popup (Answer / Reject / Hold / Mute / Transfer / Record / Copy / Open Contact)
- Dashboard widgets + Recharts live charts (React Query refresh)
- Contacts, queues, history export, recordings, tray, updater, offline queue
- Tailwind CSS + shadcn-style UI primitives, React Hook Form + Zod

## Stack

Electron · TypeScript · React · Vite · Tailwind · React Query · Axios · Zustand · better-sqlite3 · electron-store · electron-builder · Recharts · Vitest · ESLint · Prettier · Husky

## Quick start

```bash
npm install
npm run dev
```

Default softphone admin: `admin` / `admin` (change immediately).

```bash
npm test
npm run build
npm run dist:win
```

## Docs

| Doc              | Path                                                                 |
| ---------------- | -------------------------------------------------------------------- |
| Simotel research | [docs/guides/SIMOTEL_REFERENCE.md](docs/guides/SIMOTEL_REFERENCE.md) |
| Architecture     | [docs/guides/ARCHITECTURE.md](docs/guides/ARCHITECTURE.md)           |
| API              | [docs/guides/API.md](docs/guides/API.md)                             |
| Developer        | [docs/guides/DEVELOPER.md](docs/guides/DEVELOPER.md)                 |
| Deployment       | [docs/guides/DEPLOYMENT.md](docs/guides/DEPLOYMENT.md)               |

## License

MIT
