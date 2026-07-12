# Developer Documentation

## Module map

| Module | Responsibility |
|--------|----------------|
| `electron/main/db` | SQLite schema, repositories, migrations |
| `electron/main/services/simotelApi.ts` | HTTP client (retry, timeout, auth, cache) |
| `electron/main/realtime/engine.ts` | Protocol negotiation + reconnect |
| `electron/main/services/callService.ts` | Active call state, popup, history write |
| `electron/main/ipc/handlers.ts` | All IPC surface area |
| `electron/main/tray` | Tray menu, answer/reject, quit |
| `electron/main/updater` | electron-updater integration |
| `electron/preload` | `contextBridge` API |
| `src/features/*` | UI feature modules |
| `src/api/*` | DTO, validation, repository, service |
| `shared/*` | Cross-process types & constants |

## Design decisions

1. **Main-process API ownership** — Simotel credentials never enter the renderer; only the preload bridge is exposed.
2. **SQLite as system of record for local data** — contacts, settings, logs, and history survive restarts and support offline use.
3. **Realtime fallback ladder** — WebSocket → SSE → long/smart polling with exponential backoff avoids busy-waiting when push is unavailable.
4. **Feature folders over type folders** — UI code is grouped by product capability (contacts, queues, …) for maintainability.
5. **Zod at boundaries** — Forms and service inputs validate before IPC/API calls.

## Local development

```bash
npm install
npm run dev
```

electron-vite starts main, preload, and renderer with HMR.

### Useful scripts

| Script | Purpose |
|--------|---------|
| `npm run typecheck` | `tsc` for node + web projects |
| `npm test` | Vitest unit tests |
| `npm run build` | Compile to `out/` |
| `npm run lint` | ESLint (when configured in CI) |

## Adding a Simotel endpoint

1. Add DTO in `src/api/dto/simotel.ts`
2. Add method on `SimotelApiClient`
3. Expose via IPC channel in `shared/constants` + `ipc/handlers` + preload
4. Add repository/service methods if UI needs business rules
5. Cover with a Vitest test mocking `fetch`

## Testing notes

- Unit tests mock `fetch` for the API client
- Realtime mapping tests do not require a live PBX
- better-sqlite3 native bindings are exercised only in the Electron main process

## Security notes

- `contextIsolation: true`, `nodeIntegration: false`
- CSP set in `index.html`
- API keys stored in local SQLite (protect user profile disk / disk encryption on agent PCs)

## UI guidelines

Modern CTI inspired by 3CX / Teams Calling: dark/light themes, rounded panels, skeleton loaders, empty states, toast feedback, responsive sidebar.
