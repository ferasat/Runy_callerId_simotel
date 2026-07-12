import { useEffect, useState } from 'react'
import { v4 as uuid } from 'uuid'
import { api } from '@/api/client/bridge'
import { loginSchema, serverSchema } from '@/api/validation/schemas'
import { useAppStore } from '@/stores/appStore'
import type { ServerConfig } from '@shared/types'

export function LoginPage() {
  const servers = useAppStore((s) => s.servers)
  const setServers = useAppStore((s) => s.setServers)
  const setSession = useAppStore((s) => s.setSession)
  const setUser = useAppStore((s) => s.setUser)
  const setConnection = useAppStore((s) => s.setConnection)
  const showToast = useAppStore((s) => s.showToast)

  const [serverId, setServerId] = useState('')
  const [extension, setExtension] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    name: '',
    baseUrl: '',
    apiPath: 'api/v4',
    apiKey: '',
    isDefault: true
  })

  useEffect(() => {
    if (servers.length && !serverId) {
      const def = servers.find((s) => s.isDefault) ?? servers[0]
      setServerId(def.id)
    }
  }, [servers, serverId])

  async function saveServer(): Promise<void> {
    const parsed = serverSchema.safeParse(form)
    if (!parsed.success) {
      showToast(parsed.error.errors[0]?.message ?? 'Invalid server', 'error')
      return
    }
    const server: ServerConfig = {
      id: uuid(),
      name: parsed.data.name,
      baseUrl: parsed.data.baseUrl,
      apiPath: parsed.data.apiPath,
      apiKey: parsed.data.apiKey,
      isDefault: parsed.data.isDefault,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    try {
      await api.bridge.servers.test(server)
      const saved = await api.bridge.servers.save(server)
      const list = await api.bridge.servers.list()
      setServers(list)
      setServerId(saved.id)
      showToast('Server saved', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Server test failed', 'error')
    }
  }

  async function login(): Promise<void> {
    const parsed = loginSchema.safeParse({ serverId, extension, name })
    if (!parsed.success) {
      showToast(parsed.error.errors[0]?.message ?? 'Invalid login', 'error')
      return
    }
    setBusy(true)
    try {
      const result = await api.bridge.auth.login(parsed.data)
      setUser(result.user)
      setSession({
        serverId: result.server.id,
        extension: result.user.extension,
        name: result.user.name
      })
      setConnection(result.connection)
      showToast('Connected', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Login failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ maxWidth: 880, margin: '40px auto' }} className="stack">
      <div className="panel">
        <h1>Simotel Softphone</h1>
        <p className="muted">Connect to your Simotel PBX with API key authentication.</p>
      </div>

      <div className="grid-2">
        <div className="panel stack">
          <h2>Server</h2>
          <label className="label">
            Name
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="label">
            Base URL
            <input
              className="input"
              placeholder="https://pbx.example.com"
              value={form.baseUrl}
              onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
            />
          </label>
          <label className="label">
            API Path
            <input className="input" value={form.apiPath} onChange={(e) => setForm({ ...form, apiPath: e.target.value })} />
          </label>
          <label className="label">
            API Key
            <input className="input" type="password" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} />
          </label>
          <button type="button" className="btn btn-primary" onClick={() => void saveServer()}>
            Test & Save Server
          </button>
        </div>

        <div className="panel stack">
          <h2>Agent Login</h2>
          <label className="label">
            Server
            <select className="select" value={serverId} onChange={(e) => setServerId(e.target.value)}>
              <option value="">Select…</option>
              {servers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="label">
            Extension
            <input className="input" value={extension} onChange={(e) => setExtension(e.target.value)} />
          </label>
          <label className="label">
            Display name
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void login()}>
            {busy ? 'Connecting…' : 'Login'}
          </button>
        </div>
      </div>
    </div>
  )
}
