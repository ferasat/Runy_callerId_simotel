# Architecture Overview

## Goals

Ship a maintainable Simotel desktop CTI client that works in real call centers: caller popup, click-to-call, queues, contacts, history, recordings, tray, updates, and offline resilience.

## Process model

```
┌────────────────────┐   IPC (contextBridge)   ┌────────────────────┐
│  React Renderer    │ ◄─────────────────────► │  Electron Main     │
│  UI + Zustand      │     window.simotel      │  SQLite + Simotel  │
└────────────────────┘                         └─────────┬──────────┘
                                                         │ HTTPS / WS
                                                         ▼
                                                   Simotel PBX v4
```

## Module responsibilities

1. **Database** — WAL SQLite schema for servers, users, settings, contacts, history, logs, notifications, queues/agents cache, recordings, offline request queue.
2. **API client** — Every remote call has timeout, retry/backoff, `X-APIKEY` auth, logging, optional caching, and typed errors.
3. **Realtime engine** — Negotiates WebSocket → SSE → long/smart polling; reconnects with exponential backoff; avoids empty busy-polling.
4. **Call service** — Owns active call state, popup window, desktop notifications, and history persistence.
5. **Renderer features** — Dashboard, Contacts, Queues, History, Recordings, Search, Settings, Caller Popup, Agent Status.
6. **Ops** — Tray quick actions, electron-updater, backup/restore, structured local logs.

## Why these choices

| Choice | Reason |
|--------|--------|
| electron-vite | Fast HMR + clean main/preload/renderer split |
| better-sqlite3 | Synchronous, small footprint, reliable on Windows agents |
| Zod validation | Fail fast at UI/service boundaries |
| Preload-only bridge | Keep secrets and Node APIs out of the renderer |
| Hash router | Works with `file://` packaged loads |

## Incremental delivery note

The codebase is organized so modules can be extended independently (new Simotel endpoints → DTO → client method → IPC → UI) without rewriting the shell.
