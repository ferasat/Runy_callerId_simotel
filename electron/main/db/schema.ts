/**
 * SQLite schema for Simotel Softphone local database.
 *
 * Design:
 * - All user-facing state that must survive restarts lives here.
 * - Remote Simotel data is cached with updated_at for sync/offline.
 * - Soft deletes avoided; explicit delete + audit via logs table.
 */

export const SCHEMA_VERSION = 2

export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS servers (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  host TEXT,
  port INTEGER,
  https INTEGER NOT NULL DEFAULT 1,
  api_path TEXT NOT NULL DEFAULT 'api/v4',
  api_auth TEXT NOT NULL DEFAULT 'both',
  api_key TEXT NOT NULL DEFAULT '',
  encrypted_api_key TEXT,
  username TEXT,
  password TEXT,
  encrypted_password TEXT,
  timeout_ms INTEGER NOT NULL DEFAULT 15000,
  reconnect_json TEXT NOT NULL DEFAULT '{"enabled":true,"maxRetries":8,"baseDelayMs":1000}',
  is_default INTEGER NOT NULL DEFAULT 0,
  health TEXT NOT NULL DEFAULT 'unknown',
  last_health_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  server_id TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  extension TEXT NOT NULL,
  name TEXT NOT NULL,
  number TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'offline',
  custom_status_label TEXT,
  status_changed_at TEXT,
  UNIQUE(server_id, extension)
);

CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY NOT NULL,
  full_name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  extension TEXT NOT NULL,
  agent_id TEXT,
  queue_membership_json TEXT NOT NULL DEFAULT '[]',
  role TEXT NOT NULL DEFAULT 'agent',
  avatar_url TEXT,
  theme TEXT NOT NULL DEFAULT 'system',
  language TEXT NOT NULL DEFAULT 'en',
  permissions_json TEXT NOT NULL DEFAULT '[]',
  server_id TEXT,
  last_login_at TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS contact_groups (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL UNIQUE,
  color TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  address TEXT,
  avatar_url TEXT,
  numbers_json TEXT NOT NULL DEFAULT '[]',
  tags_json TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  group_ids_json TEXT NOT NULL DEFAULT '[]',
  is_favorite INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'local',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS favorites (
  contact_id TEXT PRIMARY KEY NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recent_calls (
  id TEXT PRIMARY KEY NOT NULL,
  phone_number TEXT NOT NULL,
  contact_name TEXT,
  direction TEXT NOT NULL,
  started_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS call_history (
  id TEXT PRIMARY KEY NOT NULL,
  unique_id TEXT,
  phone_number TEXT NOT NULL,
  contact_name TEXT,
  company TEXT,
  queue TEXT,
  agent TEXT,
  extension TEXT,
  direction TEXT NOT NULL,
  disposition TEXT,
  duration_sec INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  recording_file TEXT,
  notes TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_call_history_started ON call_history(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_history_phone ON call_history(phone_number);
CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company);

CREATE TABLE IF NOT EXISTS logs (
  id TEXT PRIMARY KEY NOT NULL,
  category TEXT NOT NULL,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  meta_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_logs_created ON logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_category ON logs(category);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data_json TEXT,
  created_at TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS queues_cache (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  number TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agents_cache (
  id TEXT PRIMARY KEY NOT NULL,
  number TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recordings (
  id TEXT PRIMARY KEY NOT NULL,
  file TEXT NOT NULL UNIQUE,
  call_id TEXT,
  phone_number TEXT,
  duration_sec INTEGER,
  created_at TEXT NOT NULL,
  local_path TEXT
);

CREATE TABLE IF NOT EXISTS cache (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  expires_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_status_history (
  id TEXT PRIMARY KEY NOT NULL,
  status TEXT NOT NULL,
  label TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  duration_sec INTEGER
);

CREATE TABLE IF NOT EXISTS request_queue (
  id TEXT PRIMARY KEY NOT NULL,
  method TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  body_json TEXT,
  created_at TEXT NOT NULL,
  retries INTEGER NOT NULL DEFAULT 0,
  last_error TEXT
);
`

export const MIGRATION_V2 = `
ALTER TABLE servers ADD COLUMN host TEXT;
ALTER TABLE servers ADD COLUMN port INTEGER;
ALTER TABLE servers ADD COLUMN https INTEGER NOT NULL DEFAULT 1;
ALTER TABLE servers ADD COLUMN api_auth TEXT NOT NULL DEFAULT 'both';
ALTER TABLE servers ADD COLUMN encrypted_api_key TEXT;
ALTER TABLE servers ADD COLUMN encrypted_password TEXT;
ALTER TABLE servers ADD COLUMN timeout_ms INTEGER NOT NULL DEFAULT 15000;
ALTER TABLE servers ADD COLUMN reconnect_json TEXT NOT NULL DEFAULT '{"enabled":true,"maxRetries":8,"baseDelayMs":1000}';
ALTER TABLE servers ADD COLUMN health TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE servers ADD COLUMN last_health_at TEXT;

CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY NOT NULL,
  full_name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  extension TEXT NOT NULL,
  agent_id TEXT,
  queue_membership_json TEXT NOT NULL DEFAULT '[]',
  role TEXT NOT NULL DEFAULT 'agent',
  avatar_url TEXT,
  theme TEXT NOT NULL DEFAULT 'system',
  language TEXT NOT NULL DEFAULT 'en',
  permissions_json TEXT NOT NULL DEFAULT '[]',
  server_id TEXT,
  last_login_at TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`

export const MIGRATIONS: Record<number, string> = {
  1: SCHEMA_SQL,
  2: MIGRATION_V2
}
