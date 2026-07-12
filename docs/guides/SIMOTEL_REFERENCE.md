# Simotel Official API Reference (Research Notes)

Sources studied before implementation:

1. [nasimtel/simotel-api-postman/local-simotel](https://github.com/nasimtel/simotel-api-postman/tree/main/local-simotel)
2. [nasimtel/simotel-laravel-connect](https://github.com/nasimtel/simotel-laravel-connect)
3. Local copy also present in this repo: `docs/Simotel_V4_edition_3.postman_collection.json`

## Authentication

From `simotel-laravel-connect` config and Postman collection:

| Mode    | Mechanism                                                    |
| ------- | ------------------------------------------------------------ |
| `basic` | HTTP Basic (`api_user` / `api_pass`)                         |
| `token` | Header `X-APIKEY: {api_key}`                                 |
| `both`  | Basic **and** `X-APIKEY` (Postman default for local Simotel) |

Server address pattern:

```
{scheme}://{host}[:{port}]/api/v4/{resource}/{action}
```

All documented management calls are **POST** with JSON body.

Response envelope (Laravel package):

```json
{
  "success": true,
  "message": "...",
  "data": []
}
```

Use `success` (Simotel business result) separately from HTTP 2xx.

## Event API (push from Simotel)

Simotel can POST events to a listener. Official event names:

| Event                          | Softphone use               |
| ------------------------------ | --------------------------- |
| `IncomingCall`                 | Caller popup, ring UI       |
| `OutgoingCall`                 | Outbound tracking           |
| `NewState`                     | Channel/agent state changes |
| `Transfer`                     | Transfer notifications      |
| `Cdr`                          | Call history upsert         |
| `CdrQueue`                     | Queue CDR / wait metrics    |
| `ExtenAdded` / `ExtenRemoved`  | Extension directory sync    |
| `IncomingFax`                  | Optional notify             |
| `VoiceMail` / `VoiceMailEmail` | Optional notify             |
| `Survey`                       | Optional                    |
| `Ping`                         | Keepalive / health          |

Desktop strategy:

1. Prefer embedded local HTTP webhook receiver (Event API) when Simotel can reach the agent PC (LAN).
2. Else WebSocket / SSE if PBX exposes them.
3. Else smart polling of reports/active state with backoff.

Event payloads are opaque key/value maps (`request()->all()` in Laravel). Softphone normalizes common fields: `caller`, `callee`, `src`, `dst`, `uniqueid`, `queue`, `event`, `state`, `exten`.

## Management API surface (v4 Postman)

Used by this softphone:

- `setting/ping/act` — health
- `pbx/users/search` — agents/extensions
- `pbx/queues/search|addagent|removeagent|pauseagent|resumeagent`
- `call/originate/act` — click-to-call
- `reports/cdr/search`, `reports/quick/search`, `reports/queue/search`
- `reports/audio/download` — recordings

Also available (admin / future modules): trunks, blacklists, announcements, faxes, voicemails, autodialer, agent reports.

## Replaceability

All remote I/O goes through `SimotelApiClient` + DTO/repository/service layers so endpoint paths and auth modes can change without UI rewrites.
