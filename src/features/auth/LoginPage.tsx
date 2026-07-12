import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { v4 as uuid } from 'uuid'
import { api } from '@/api/client/bridge'
import { useAppStore } from '@/stores/appStore'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Input, Label, Select } from '@/components/ui/input'
import type { ApiAuthMode, ServerConfig } from '@shared/types'

const serverFormSchema = z.object({
  name: z.string().min(1),
  baseUrl: z.string().url(),
  apiPath: z.string().min(1),
  apiAuth: z.enum(['basic', 'token', 'both']),
  apiKey: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  timeoutMs: z.coerce.number().min(1000),
  isDefault: z.boolean()
})

const loginFormSchema = z.object({
  serverId: z.string().min(1),
  username: z.string().optional(),
  password: z.string().optional(),
  extension: z.string().optional(),
  name: z.string().optional()
})

type ServerForm = z.infer<typeof serverFormSchema>
type LoginForm = z.infer<typeof loginFormSchema>

export function LoginPage() {
  const servers = useAppStore((s) => s.servers)
  const setServers = useAppStore((s) => s.setServers)
  const setSession = useAppStore((s) => s.setSession)
  const setUser = useAppStore((s) => s.setUser)
  const setConnection = useAppStore((s) => s.setConnection)
  const settings = useAppStore((s) => s.settings)
  const showToast = useAppStore((s) => s.showToast)

  const serverForm = useForm<ServerForm>({
    resolver: zodResolver(serverFormSchema),
    defaultValues: {
      name: '',
      baseUrl: 'https://',
      apiPath: 'api/v4',
      apiAuth: 'both',
      apiKey: '',
      username: '',
      password: '',
      timeoutMs: 15000,
      isDefault: true
    }
  })

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      serverId: settings.defaultServerId ?? '',
      username: settings.lastUsername ?? 'admin',
      password: '',
      extension: settings.defaultExtension ?? '',
      name: ''
    }
  })

  async function saveServer(values: ServerForm): Promise<void> {
    if ((values.apiAuth === 'token' || values.apiAuth === 'both') && !values.apiKey) {
      showToast('API key required for token/both auth', 'error')
      return
    }
    if ((values.apiAuth === 'basic' || values.apiAuth === 'both') && !values.username) {
      showToast('Username required for basic/both auth', 'error')
      return
    }
    const server: ServerConfig = {
      id: uuid(),
      name: values.name,
      baseUrl: values.baseUrl,
      apiPath: values.apiPath,
      apiAuth: values.apiAuth as ApiAuthMode,
      apiKey: values.apiKey ?? '',
      username: values.username,
      password: values.password,
      timeoutMs: values.timeoutMs,
      reconnectPolicy: { enabled: true, maxRetries: 8, baseDelayMs: 1000 },
      isDefault: values.isDefault,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    try {
      await api.bridge.servers.test(server)
      const saved = await api.bridge.servers.save(server)
      setServers(await api.bridge.servers.list())
      loginForm.setValue('serverId', saved.id)
      showToast('Server saved & healthy', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Server test failed', 'error')
    }
  }

  async function login(values: LoginForm): Promise<void> {
    try {
      const result = await api.bridge.auth.login(values)
      setUser(result.user)
      setSession(result.session)
      setConnection(result.connection)
      showToast('Connected to Simotel', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Login failed', 'error')
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 p-8">
      <Card>
        <CardTitle>Simotel Softphone</CardTitle>
        <CardDescription>
          Enterprise CTI client — auth modes: basic, token, or both (official Simotel v4). Default
          admin user: <code>admin / admin</code>
        </CardDescription>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col gap-3">
          <CardTitle>Server</CardTitle>
          <form
            className="flex flex-col gap-3"
            onSubmit={serverForm.handleSubmit((v) => void saveServer(v))}
          >
            <Label>
              Name
              <Input {...serverForm.register('name')} />
            </Label>
            <Label>
              Base URL
              <Input placeholder="https://pbx.example.com" {...serverForm.register('baseUrl')} />
            </Label>
            <Label>
              API Path
              <Input {...serverForm.register('apiPath')} />
            </Label>
            <Label>
              Auth mode
              <Select {...serverForm.register('apiAuth')}>
                <option value="both">both (Basic + X-APIKEY)</option>
                <option value="token">token (X-APIKEY)</option>
                <option value="basic">basic</option>
              </Select>
            </Label>
            <Label>
              API Key
              <Input type="password" {...serverForm.register('apiKey')} />
            </Label>
            <Label>
              API Username
              <Input {...serverForm.register('username')} />
            </Label>
            <Label>
              API Password
              <Input type="password" {...serverForm.register('password')} />
            </Label>
            <Label>
              Timeout (ms)
              <Input type="number" {...serverForm.register('timeoutMs')} />
            </Label>
            <Button type="submit" variant="primary">
              Test & Save Server
            </Button>
          </form>
        </Card>

        <Card className="flex flex-col gap-3">
          <CardTitle>Agent Login</CardTitle>
          <form
            className="flex flex-col gap-3"
            onSubmit={loginForm.handleSubmit((v) => void login(v))}
          >
            <Label>
              Server
              <Select {...loginForm.register('serverId')}>
                <option value="">Select…</option>
                {servers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.health ?? 'unknown'})
                  </option>
                ))}
              </Select>
            </Label>
            <Label>
              Softphone username
              <Input {...loginForm.register('username')} />
            </Label>
            <Label>
              Softphone password
              <Input type="password" {...loginForm.register('password')} />
            </Label>
            <Label>
              Extension override
              <Input
                {...loginForm.register('extension')}
                placeholder="Uses user extension if empty"
              />
            </Label>
            <Label>
              Display name
              <Input {...loginForm.register('name')} />
            </Label>
            <Button type="submit" variant="primary">
              Login
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
