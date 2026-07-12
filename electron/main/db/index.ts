import Database from 'better-sqlite3'
import { app } from 'electron'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { v4 as uuid } from 'uuid'
import { DEFAULT_SETTINGS } from '../../../shared/constants'
import type {
  AppSettings,
  CallHistoryEntry,
  Contact,
  ContactGroup,
  LogEntry,
  NotificationPayload,
  ServerConfig,
  UserProfile
} from '../../../shared/types'
import { MIGRATIONS, SCHEMA_VERSION } from './schema'

let db: Database.Database | null = null

function now(): string {
  return new Date().toISOString()
}

export function getDbPath(): string {
  const dir = join(app.getPath('userData'), 'data')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, 'simotel.db')
}

export function openDatabase(path = getDbPath()): Database.Database {
  if (db) return db
  db = new Database(path)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  migrate(db)
  seedDefaults(db)
  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

function migrate(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `)
  const row = database.prepare(`SELECT value FROM meta WHERE key = 'schema_version'`).get() as
    | { value: string }
    | undefined
  const current = row ? Number(row.value) : 0
  for (let v = current + 1; v <= SCHEMA_VERSION; v += 1) {
    const sql = MIGRATIONS[v]
    if (!sql) throw new Error(`Missing migration for schema version ${v}`)
    database.exec(sql)
    database
      .prepare(
        `INSERT INTO meta(key, value) VALUES('schema_version', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`
      )
      .run(String(v))
  }
}

function seedDefaults(database: Database.Database): void {
  const count = (
    database.prepare(`SELECT COUNT(*) as c FROM settings`).get() as { c: number }
  ).c
  if (count === 0) {
    const insert = database.prepare(
      `INSERT INTO settings(key, value) VALUES(?, ?)`
    )
    const tx = database.transaction(() => {
      for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        insert.run(key, JSON.stringify(value))
      }
    })
    tx()
  }
}

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export const serversRepo = {
  list(): ServerConfig[] {
    const rows = openDatabase()
      .prepare(`SELECT * FROM servers ORDER BY is_default DESC, name ASC`)
      .all() as Array<Record<string, unknown>>
    return rows.map(mapServer)
  },
  get(id: string): ServerConfig | null {
    const row = openDatabase().prepare(`SELECT * FROM servers WHERE id = ?`).get(id) as
      | Record<string, unknown>
      | undefined
    return row ? mapServer(row) : null
  },
  getDefault(): ServerConfig | null {
    const row = openDatabase()
      .prepare(`SELECT * FROM servers WHERE is_default = 1 LIMIT 1`)
      .get() as Record<string, unknown> | undefined
    return row ? mapServer(row) : null
  },
  save(input: Omit<ServerConfig, 'createdAt' | 'updatedAt'> & Partial<Pick<ServerConfig, 'createdAt' | 'updatedAt'>>): ServerConfig {
    const database = openDatabase()
    const existing = input.id ? this.get(input.id) : null
    const id = input.id || uuid()
    const createdAt = existing?.createdAt ?? input.createdAt ?? now()
    const updatedAt = now()
    if (input.isDefault) {
      database.prepare(`UPDATE servers SET is_default = 0`).run()
    }
    database
      .prepare(
        `INSERT INTO servers(id, name, base_url, api_path, api_key, username, password, is_default, created_at, updated_at)
         VALUES(@id, @name, @base_url, @api_path, @api_key, @username, @password, @is_default, @created_at, @updated_at)
         ON CONFLICT(id) DO UPDATE SET
           name=excluded.name,
           base_url=excluded.base_url,
           api_path=excluded.api_path,
           api_key=excluded.api_key,
           username=excluded.username,
           password=excluded.password,
           is_default=excluded.is_default,
           updated_at=excluded.updated_at`
      )
      .run({
        id,
        name: input.name,
        base_url: input.baseUrl,
        api_path: input.apiPath,
        api_key: input.apiKey,
        username: input.username ?? null,
        password: input.password ?? null,
        is_default: input.isDefault ? 1 : 0,
        created_at: createdAt,
        updated_at: updatedAt
      })
    return this.get(id)!
  },
  delete(id: string): void {
    openDatabase().prepare(`DELETE FROM servers WHERE id = ?`).run(id)
  }
}

function mapServer(row: Record<string, unknown>): ServerConfig {
  return {
    id: String(row.id),
    name: String(row.name),
    baseUrl: String(row.base_url),
    apiPath: String(row.api_path),
    apiKey: String(row.api_key),
    username: row.username ? String(row.username) : undefined,
    password: row.password ? String(row.password) : undefined,
    isDefault: Boolean(row.is_default),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  }
}

export const settingsRepo = {
  get(): AppSettings {
    const rows = openDatabase().prepare(`SELECT key, value FROM settings`).all() as Array<{
      key: string
      value: string
    }>
    const map: Record<string, unknown> = {
      ...(DEFAULT_SETTINGS as unknown as Record<string, unknown>)
    }
    for (const row of rows) {
      const fallback = (DEFAULT_SETTINGS as unknown as Record<string, unknown>)[row.key]
      map[row.key] = parseJson(row.value, fallback)
    }
    return map as unknown as AppSettings
  },
  set(partial: Partial<AppSettings>): AppSettings {
    const database = openDatabase()
    const upsert = database.prepare(
      `INSERT INTO settings(key, value) VALUES(?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    )
    const tx = database.transaction(() => {
      for (const [key, value] of Object.entries(partial)) {
        upsert.run(key, JSON.stringify(value))
      }
    })
    tx()
    return this.get()
  }
}

export const contactsRepo = {
  list(): Contact[] {
    return (
      openDatabase().prepare(`SELECT * FROM contacts ORDER BY name COLLATE NOCASE`).all() as Array<
        Record<string, unknown>
      >
    ).map(mapContact)
  },
  get(id: string): Contact | null {
    const row = openDatabase().prepare(`SELECT * FROM contacts WHERE id = ?`).get(id) as
      | Record<string, unknown>
      | undefined
    return row ? mapContact(row) : null
  },
  search(query: string): Contact[] {
    const q = `%${query.trim().toLowerCase()}%`
    const rows = openDatabase()
      .prepare(
        `SELECT * FROM contacts
         WHERE lower(name) LIKE @q
            OR lower(IFNULL(company,'')) LIKE @q
            OR lower(IFNULL(email,'')) LIKE @q
            OR lower(numbers_json) LIKE @q
            OR lower(tags_json) LIKE @q
         ORDER BY name COLLATE NOCASE
         LIMIT 200`
      )
      .all({ q }) as Array<Record<string, unknown>>
    return rows.map(mapContact)
  },
  favorites(): Contact[] {
    return this.list().filter((c) => c.isFavorite)
  },
  save(input: Omit<Contact, 'createdAt' | 'updatedAt'> & Partial<Pick<Contact, 'createdAt' | 'updatedAt'>>): Contact {
    const database = openDatabase()
    const existing = input.id ? this.get(input.id) : null
    const id = input.id || uuid()
    const createdAt = existing?.createdAt ?? input.createdAt ?? now()
    const updatedAt = now()
    database
      .prepare(
        `INSERT INTO contacts(
           id, name, company, email, address, avatar_url, numbers_json, tags_json,
           notes, group_ids_json, is_favorite, source, created_at, updated_at
         ) VALUES (
           @id, @name, @company, @email, @address, @avatar_url, @numbers_json, @tags_json,
           @notes, @group_ids_json, @is_favorite, @source, @created_at, @updated_at
         )
         ON CONFLICT(id) DO UPDATE SET
           name=excluded.name,
           company=excluded.company,
           email=excluded.email,
           address=excluded.address,
           avatar_url=excluded.avatar_url,
           numbers_json=excluded.numbers_json,
           tags_json=excluded.tags_json,
           notes=excluded.notes,
           group_ids_json=excluded.group_ids_json,
           is_favorite=excluded.is_favorite,
           source=excluded.source,
           updated_at=excluded.updated_at`
      )
      .run({
        id,
        name: input.name,
        company: input.company ?? null,
        email: input.email ?? null,
        address: input.address ?? null,
        avatar_url: input.avatarUrl ?? null,
        numbers_json: JSON.stringify(input.numbers ?? []),
        tags_json: JSON.stringify(input.tags ?? []),
        notes: input.notes ?? null,
        group_ids_json: JSON.stringify(input.groupIds ?? []),
        is_favorite: input.isFavorite ? 1 : 0,
        source: input.source ?? 'local',
        created_at: createdAt,
        updated_at: updatedAt
      })
    if (input.isFavorite) {
      database
        .prepare(
          `INSERT INTO favorites(contact_id, created_at) VALUES(?, ?)
           ON CONFLICT(contact_id) DO NOTHING`
        )
        .run(id, updatedAt)
    } else {
      database.prepare(`DELETE FROM favorites WHERE contact_id = ?`).run(id)
    }
    return this.get(id)!
  },
  delete(id: string): void {
    openDatabase().prepare(`DELETE FROM contacts WHERE id = ?`).run(id)
  },
  importMany(contacts: Contact[]): number {
    const database = openDatabase()
    const tx = database.transaction((items: Contact[]) => {
      for (const c of items) this.save(c)
    })
    tx(contacts)
    return contacts.length
  }
}

function mapContact(row: Record<string, unknown>): Contact {
  return {
    id: String(row.id),
    name: String(row.name),
    company: row.company ? String(row.company) : undefined,
    email: row.email ? String(row.email) : undefined,
    address: row.address ? String(row.address) : undefined,
    avatarUrl: row.avatar_url ? String(row.avatar_url) : undefined,
    numbers: parseJson(String(row.numbers_json ?? '[]'), []),
    tags: parseJson(String(row.tags_json ?? '[]'), []),
    notes: row.notes ? String(row.notes) : undefined,
    groupIds: parseJson(String(row.group_ids_json ?? '[]'), []),
    isFavorite: Boolean(row.is_favorite),
    source: (row.source as Contact['source']) || 'local',
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  }
}

export const groupsRepo = {
  list(): ContactGroup[] {
    return (
      openDatabase()
        .prepare(`SELECT * FROM contact_groups ORDER BY name COLLATE NOCASE`)
        .all() as Array<Record<string, unknown>>
    ).map((row) => ({
      id: String(row.id),
      name: String(row.name),
      color: row.color ? String(row.color) : undefined,
      createdAt: String(row.created_at)
    }))
  },
  save(group: Omit<ContactGroup, 'createdAt'> & Partial<Pick<ContactGroup, 'createdAt'>>): ContactGroup {
    const id = group.id || uuid()
    const createdAt = group.createdAt ?? now()
    openDatabase()
      .prepare(
        `INSERT INTO contact_groups(id, name, color, created_at)
         VALUES(?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET name=excluded.name, color=excluded.color`
      )
      .run(id, group.name, group.color ?? null, createdAt)
    return { id, name: group.name, color: group.color, createdAt }
  }
}

export const callHistoryRepo = {
  list(opts: {
    start?: number
    count?: number
    search?: string
    sortBy?: string
    sortDir?: 'asc' | 'desc'
  } = {}): { items: CallHistoryEntry[]; total: number } {
    const start = opts.start ?? 0
    const count = opts.count ?? 50
    const sortBy = ['started_at', 'duration_sec', 'phone_number', 'contact_name'].includes(
      opts.sortBy ?? ''
    )
      ? opts.sortBy!
      : 'started_at'
    const sortDir = opts.sortDir === 'asc' ? 'ASC' : 'DESC'
    const search = opts.search?.trim()
    const database = openDatabase()
    let where = ''
    const params: Record<string, unknown> = { start, count }
    if (search) {
      where = `WHERE phone_number LIKE @q OR IFNULL(contact_name,'') LIKE @q OR IFNULL(company,'') LIKE @q OR IFNULL(queue,'') LIKE @q OR IFNULL(agent,'') LIKE @q`
      params.q = `%${search}%`
    }
    const total = (
      database.prepare(`SELECT COUNT(*) as c FROM call_history ${where}`).get(params) as {
        c: number
      }
    ).c
    const rows = database
      .prepare(
        `SELECT * FROM call_history ${where} ORDER BY ${sortBy} ${sortDir} LIMIT @count OFFSET @start`
      )
      .all(params) as Array<Record<string, unknown>>
    return { items: rows.map(mapHistory), total }
  },
  save(entry: CallHistoryEntry): void {
    openDatabase()
      .prepare(
        `INSERT INTO call_history(
           id, unique_id, phone_number, contact_name, company, queue, agent, extension,
           direction, disposition, duration_sec, started_at, ended_at, recording_file, notes, tags_json
         ) VALUES (
           @id, @unique_id, @phone_number, @contact_name, @company, @queue, @agent, @extension,
           @direction, @disposition, @duration_sec, @started_at, @ended_at, @recording_file, @notes, @tags_json
         )
         ON CONFLICT(id) DO UPDATE SET
           contact_name=excluded.contact_name,
           disposition=excluded.disposition,
           duration_sec=excluded.duration_sec,
           ended_at=excluded.ended_at,
           recording_file=excluded.recording_file,
           notes=excluded.notes,
           tags_json=excluded.tags_json`
      )
      .run({
        id: entry.id,
        unique_id: entry.uniqueId ?? null,
        phone_number: entry.phoneNumber,
        contact_name: entry.contactName ?? null,
        company: entry.company ?? null,
        queue: entry.queue ?? null,
        agent: entry.agent ?? null,
        extension: entry.extension ?? null,
        direction: entry.direction,
        disposition: entry.disposition ?? null,
        duration_sec: entry.durationSec,
        started_at: entry.startedAt,
        ended_at: entry.endedAt ?? null,
        recording_file: entry.recordingFile ?? null,
        notes: entry.notes ?? null,
        tags_json: JSON.stringify(entry.tags ?? [])
      })
  },
  allForExport(): CallHistoryEntry[] {
    return (
      openDatabase()
        .prepare(`SELECT * FROM call_history ORDER BY started_at DESC`)
        .all() as Array<Record<string, unknown>>
    ).map(mapHistory)
  }
}

function mapHistory(row: Record<string, unknown>): CallHistoryEntry {
  return {
    id: String(row.id),
    uniqueId: row.unique_id ? String(row.unique_id) : undefined,
    phoneNumber: String(row.phone_number),
    contactName: row.contact_name ? String(row.contact_name) : undefined,
    company: row.company ? String(row.company) : undefined,
    queue: row.queue ? String(row.queue) : undefined,
    agent: row.agent ? String(row.agent) : undefined,
    extension: row.extension ? String(row.extension) : undefined,
    direction: row.direction as CallHistoryEntry['direction'],
    disposition: row.disposition ? String(row.disposition) : undefined,
    durationSec: Number(row.duration_sec ?? 0),
    startedAt: String(row.started_at),
    endedAt: row.ended_at ? String(row.ended_at) : undefined,
    recordingFile: row.recording_file ? String(row.recording_file) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    tags: parseJson(String(row.tags_json ?? '[]'), [])
  }
}

export const logsRepo = {
  add(entry: Omit<LogEntry, 'id' | 'createdAt'> & Partial<Pick<LogEntry, 'id' | 'createdAt'>>): LogEntry {
    const full: LogEntry = {
      id: entry.id ?? uuid(),
      category: entry.category,
      level: entry.level,
      message: entry.message,
      meta: entry.meta,
      createdAt: entry.createdAt ?? now()
    }
    openDatabase()
      .prepare(
        `INSERT INTO logs(id, category, level, message, meta_json, created_at)
         VALUES(?, ?, ?, ?, ?, ?)`
      )
      .run(
        full.id,
        full.category,
        full.level,
        full.message,
        full.meta ? JSON.stringify(full.meta) : null,
        full.createdAt
      )
    return full
  },
  list(opts: { category?: string; limit?: number } = {}): LogEntry[] {
    const limit = opts.limit ?? 500
    const database = openDatabase()
    const rows = opts.category
      ? (database
          .prepare(
            `SELECT * FROM logs WHERE category = ? ORDER BY created_at DESC LIMIT ?`
          )
          .all(opts.category, limit) as Array<Record<string, unknown>>)
      : (database
          .prepare(`SELECT * FROM logs ORDER BY created_at DESC LIMIT ?`)
          .all(limit) as Array<Record<string, unknown>>)
    return rows.map((row) => ({
      id: String(row.id),
      category: row.category as LogEntry['category'],
      level: row.level as LogEntry['level'],
      message: String(row.message),
      meta: parseJson(row.meta_json as string | null, undefined),
      createdAt: String(row.created_at)
    }))
  },
  clear(category?: string): void {
    if (category) openDatabase().prepare(`DELETE FROM logs WHERE category = ?`).run(category)
    else openDatabase().prepare(`DELETE FROM logs`).run()
  }
}

export const notificationsRepo = {
  list(): NotificationPayload[] {
    return (
      openDatabase()
        .prepare(`SELECT * FROM notifications ORDER BY created_at DESC LIMIT 200`)
        .all() as Array<Record<string, unknown>>
    ).map((row) => ({
      id: String(row.id),
      type: row.type as NotificationPayload['type'],
      title: String(row.title),
      body: String(row.body),
      data: parseJson(row.data_json as string | null, undefined),
      createdAt: String(row.created_at),
      read: Boolean(row.read)
    }))
  },
  add(n: Omit<NotificationPayload, 'id' | 'createdAt' | 'read'> & Partial<Pick<NotificationPayload, 'id' | 'createdAt' | 'read'>>): NotificationPayload {
    const full: NotificationPayload = {
      id: n.id ?? uuid(),
      type: n.type,
      title: n.title,
      body: n.body,
      data: n.data,
      createdAt: n.createdAt ?? now(),
      read: n.read ?? false
    }
    openDatabase()
      .prepare(
        `INSERT INTO notifications(id, type, title, body, data_json, created_at, read)
         VALUES(?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        full.id,
        full.type,
        full.title,
        full.body,
        full.data ? JSON.stringify(full.data) : null,
        full.createdAt,
        full.read ? 1 : 0
      )
    return full
  },
  markRead(id: string): void {
    openDatabase().prepare(`UPDATE notifications SET read = 1 WHERE id = ?`).run(id)
  }
}

export const usersRepo = {
  save(user: UserProfile): UserProfile {
    openDatabase()
      .prepare(
        `INSERT INTO users(id, server_id, extension, name, number, email, avatar_url, status, custom_status_label, status_changed_at)
         VALUES(@id, @server_id, @extension, @name, @number, @email, @avatar_url, @status, @custom_status_label, @status_changed_at)
         ON CONFLICT(id) DO UPDATE SET
           name=excluded.name,
           number=excluded.number,
           email=excluded.email,
           avatar_url=excluded.avatar_url,
           status=excluded.status,
           custom_status_label=excluded.custom_status_label,
           status_changed_at=excluded.status_changed_at`
      )
      .run({
        id: user.id,
        server_id: user.serverId,
        extension: user.extension,
        name: user.name,
        number: user.number,
        email: user.email ?? null,
        avatar_url: user.avatarUrl ?? null,
        status: user.status,
        custom_status_label: user.customStatusLabel ?? null,
        status_changed_at: user.statusChangedAt ?? null
      })
    return user
  },
  getByServer(serverId: string): UserProfile | null {
    const row = openDatabase()
      .prepare(`SELECT * FROM users WHERE server_id = ? LIMIT 1`)
      .get(serverId) as Record<string, unknown> | undefined
    if (!row) return null
    return {
      id: String(row.id),
      serverId: String(row.server_id),
      extension: String(row.extension),
      name: String(row.name),
      number: String(row.number),
      email: row.email ? String(row.email) : undefined,
      avatarUrl: row.avatar_url ? String(row.avatar_url) : undefined,
      status: row.status as UserProfile['status'],
      customStatusLabel: row.custom_status_label ? String(row.custom_status_label) : undefined,
      statusChangedAt: row.status_changed_at ? String(row.status_changed_at) : undefined
    }
  }
}

export const cacheRepo = {
  get<T>(key: string): T | null {
    const row = openDatabase().prepare(`SELECT value, expires_at FROM cache WHERE key = ?`).get(key) as
      | { value: string; expires_at: string | null }
      | undefined
    if (!row) return null
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
      openDatabase().prepare(`DELETE FROM cache WHERE key = ?`).run(key)
      return null
    }
    return parseJson<T | null>(row.value, null)
  },
  set(key: string, value: unknown, ttlMs?: number): void {
    const expiresAt = ttlMs ? new Date(Date.now() + ttlMs).toISOString() : null
    openDatabase()
      .prepare(
        `INSERT INTO cache(key, value, expires_at, updated_at) VALUES(?, ?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value=excluded.value, expires_at=excluded.expires_at, updated_at=excluded.updated_at`
      )
      .run(key, JSON.stringify(value), expiresAt, now())
  }
}

export function createBackup(targetPath: string): string {
  const database = openDatabase()
  database.backup(targetPath)
  return targetPath
}
