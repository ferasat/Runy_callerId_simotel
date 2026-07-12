# Deployment Guide

## Prerequisites

- Node.js 20+ (22 recommended)
- Windows x64 target machine for production softphones
- Simotel PBX v4 with API access enabled
- Valid API key (`X-APIKEY`)

## Build artifacts

```bash
npm ci
npm run typecheck
npm test
npm run dist:win
```

Outputs land in `release/`:

| Artifact | Use |
|----------|-----|
| `Simotel Softphone-*-win-x64.exe` (NSIS) | Standard installer |
| Portable EXE | USB / locked-down desktops without install rights |

## Code signing (optional)

Set electron-builder signing env vars before `dist`:

```bash
# Windows Authenticode example
set CSC_LINK=path\to\cert.pfx
set CSC_KEY_PASSWORD=********
npm run dist:win
```

## Auto-update feed

Configure `package.json` → `build.publish`:

```json
{
  "provider": "generic",
  "url": "https://updates.example.com/simotel-softphone"
}
```

Host `latest.yml` + installer binaries on that URL. The app checks updates on launch when `autoCheckUpdates` is enabled.

## First-run configuration (call center rollout)

1. Install / copy portable build
2. Add Simotel server URL + API key
3. Agent logs in with extension
4. Optional: enable **Start with Windows** and **Minimize to tray**
5. Import contacts CSV if needed (`name,number,company,email,address,tags,notes`)

## Firewall / network

Outbound HTTPS (or HTTP) to Simotel `baseUrl` must be allowed.

If WebSocket realtime is blocked, the engine falls back to SSE / smart polling automatically.

## Data locations

| Data | Path |
|------|------|
| SQLite DB | `%APPDATA%/simotel-softphone/data/simotel.db` |
| Logs | electron-log file under userData |
| Backups | User-selected path via Settings → Backup |

## Rollback

1. Uninstall or replace portable binary
2. Restore `simotel.db` from backup if needed
3. Keep previous installer in your update feed for emergency downgrade

## Health checks

- Settings → server ping (`setting/ping/act`)
- Connection badge shows `connected` + active protocol
- Originate a test call from Dashboard dialer
