# Simotel Softphone — API Documentation

This softphone consumes **Simotel API v4** using the official Postman collection and `simotel-laravel-connect` conventions.

Base URL pattern:

```
{baseUrl}/{apiPath}/{endpoint}
```

Example: `https://pbx.example.com/api/v4/setting/ping/act`

## Authentication

| Mode    | Mechanism                                                |
| ------- | -------------------------------------------------------- |
| `basic` | HTTP Basic (`api_user` / `api_pass`)                     |
| `token` | Header `X-APIKEY`                                        |
| `both`  | Basic **and** `X-APIKEY` (Postman local-simotel default) |

All requests: `POST` + `Content-Type: application/json`.

## Event API

Official event names: `IncomingCall`, `OutgoingCall`, `NewState`, `Transfer`, `Cdr`, `CdrQueue`, `ExtenAdded`, `ExtenRemoved`, `IncomingFax`, `VoiceMail`, `VoiceMailEmail`, `Survey`, `Ping`.

Desktop webhook listens on `eventWebhookPort` (default **3939**). Point Simotel Event API at `http://AGENT_IP:3939/`.

## Endpoints used

| Endpoint                                                             | Purpose           |
| -------------------------------------------------------------------- | ----------------- |
| `setting/ping/act`                                                   | Health            |
| `call/originate/act`                                                 | Click to call     |
| `pbx/users/search`                                                   | Agents/extensions |
| `pbx/queues/search`                                                  | Queues            |
| `pbx/queues/addagent` / `removeagent` / `pauseagent` / `resumeagent` | Queue membership  |
| `reports/cdr/search`                                                 | CDR / history     |
| `reports/quick/search`                                               | Quick reports     |
| `reports/queue/search`                                               | Queue reports     |
| `reports/audio/download`                                             | Recordings        |

Originate body:

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

## Internal IPC (`window.simotel`)

| Namespace                                               | Examples                                                                         |
| ------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `servers`                                               | `list`, `save`, `delete`, `test`, `setDefault`                                   |
| `users`                                                 | `list`, `save`, `delete` (admin)                                                 |
| `auth`                                                  | `login`, `logout`, `status`                                                      |
| `call`                                                  | `originate`, `answer`, `reject`, `mute`, `hold`, `record`, `transfer`, `history` |
| `dashboard`                                             | `stats`                                                                          |
| `contacts` / `queues` / `agent` / `recordings`          | feature APIs                                                                     |
| `realtime` / `settings` / `logs` / `updater` / `backup` | ops                                                                              |

## Client behaviors

Axios client includes timeout, exponential retry, auth mode headers, logging, optional cache, and typed `ApiError`.

Full research notes: `docs/guides/SIMOTEL_REFERENCE.md`  
Postman: `docs/Simotel_V4_edition_3.postman_collection.json`
