# Simotel Softphone — API Documentation

This softphone consumes **Simotel API v4**. All requests are `POST` with JSON bodies and the `X-APIKEY` header.

Base URL pattern:

```
{baseUrl}/{apiPath}/{endpoint}
```

Example: `https://pbx.example.com/api/v4/setting/ping/act`

## Authentication

| Header | Value |
|--------|-------|
| `X-APIKEY` | API token from Simotel |
| `Content-Type` | `application/json` |

Optional Basic auth fields can be stored per server for future use; v4 collection uses API key.

## Endpoints used by the app

### Health

`POST setting/ping/act`

Body: `{}`

### Click to call

`POST call/originate/act`

```json
{
  "caller": "557",
  "callee": "09155151515",
  "context": "outgoing_context",
  "caller_id": "557",
  "trunk_name": "trunk1",
  "timeout": "30"
}
```

### Users

`POST pbx/users/search`

```json
{
  "status": "all",
  "alike": 1,
  "conditions": { "name": "", "number": "", "mapped": "" }
}
```

### Queues

| Endpoint | Purpose |
|----------|---------|
| `pbx/queues/search` | List queues |
| `pbx/queues/addagent` | Join queue |
| `pbx/queues/removeagent` | Leave queue |
| `pbx/queues/pauseagent` | Pause agent |
| `pbx/queues/resumeagent` | Resume agent |

Pause example:

```json
{ "queue": "999", "agent": "553" }
```

### Call history / CDR

`POST reports/cdr/search`

```json
{
  "conditions": { "from": "", "to": "", "cuid": "" },
  "date_range": { "from": "2020-06-15 15:16", "to": "2020-06-22 15:16" },
  "pagination": { "start": 0, "count": 20, "sorting": {} },
  "alike": "true"
}
```

Also used: `reports/quick/search`, `reports/queue/search`.

### Recordings

`POST reports/audio/download`

```json
{ "file": "20200921_1600675211.10033.1.mp3" }
```

## Internal IPC API (`window.simotel`)

Renderer never calls Simotel directly. It uses the preload bridge:

| Namespace | Examples |
|-----------|----------|
| `servers` | `list`, `save`, `delete`, `test` |
| `auth` | `login`, `logout`, `status` |
| `call` | `originate`, `answer`, `reject`, `mute`, `transfer`, `history` |
| `contacts` | `list`, `save`, `search`, `importCsv`, `exportCsv` |
| `queues` | `list`, `join`, `leave`, `pause`, `resume` |
| `agent` | `getStatus`, `setStatus` |
| `recordings` | `list`, `download` |
| `realtime` | `status`, `onEvent`, `onConnection` |
| `settings` / `logs` / `updater` / `backup` | configuration & ops |

Channel names are centralized in `shared/constants/index.ts`.

## Client behaviors

Every HTTP call through `SimotelApiClient` includes:

- Timeout (default 15s)
- Exponential retry on network / 5xx
- Structured logging
- Optional response cache (TTL)
- Typed `ApiError` on failure

## Realtime events (normalized)

Inbound PBX payloads are mapped to:

`incoming_call` · `call_answered` · `call_ended` · `call_missed` · `transfer` · `recording_started` · `recording_finished` · `queue_update` · `agent_status`

If no push transport is available, smart polling runs with backoff to avoid unnecessary load.

## Reference

Full Postman collection: `docs/Simotel_V4_edition_3.postman_collection.json`
