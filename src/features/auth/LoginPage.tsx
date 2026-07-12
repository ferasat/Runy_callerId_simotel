import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { v4 as uuid } from 'uuid'
import { api } from '@/api/client/bridge'
import { useAppStore } from '@/stores/appStore'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Input, Label, Select } from '@/components/ui/input'
import { useI18n } from '@/i18n'
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
  const { t } = useI18n()
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
      showToast(t.login.apiKey, 'error')
      return
    }
    if ((values.apiAuth === 'basic' || values.apiAuth === 'both') && !values.username) {
      showToast(t.login.apiUsername, 'error')
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
      showToast(t.login.saved, 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.login.testFailed, 'error')
    }
  }

  async function login(values: LoginForm): Promise<void> {
    try {
      const result = await api.bridge.auth.login(values)
      setUser(result.user)
      setSession(result.session)
      setConnection(result.connection)
      showToast(t.login.connected, 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.login.failed, 'error')
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 p-8">
      <Card>
        <CardTitle>{t.login.title}</CardTitle>
        <CardDescription>{t.login.subtitle}</CardDescription>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col gap-3">
          <CardTitle>{t.login.serverSection}</CardTitle>
          <form
            className="flex flex-col gap-3"
            onSubmit={serverForm.handleSubmit((v) => void saveServer(v))}
          >
            <Label>
              {t.common.name}
              <Input {...serverForm.register('name')} />
            </Label>
            <Label>
              {t.login.baseUrl}
              <Input placeholder="https://pbx.example.com" {...serverForm.register('baseUrl')} />
            </Label>
            <Label>
              {t.login.apiPath}
              <Input {...serverForm.register('apiPath')} />
            </Label>
            <Label>
              {t.login.authMode}
              <Select {...serverForm.register('apiAuth')}>
                <option value="both">{t.login.authBoth}</option>
                <option value="token">{t.login.authToken}</option>
                <option value="basic">{t.login.authBasic}</option>
              </Select>
            </Label>
            <Label>
              {t.login.apiKey}
              <Input type="password" {...serverForm.register('apiKey')} />
            </Label>
            <Label>
              {t.login.apiUsername}
              <Input {...serverForm.register('username')} />
            </Label>
            <Label>
              {t.login.apiPassword}
              <Input type="password" {...serverForm.register('password')} />
            </Label>
            <Label>
              {t.login.timeout}
              <Input type="number" {...serverForm.register('timeoutMs')} />
            </Label>
            <Button type="submit" variant="primary">
              {t.login.testSave}
            </Button>
          </form>
        </Card>

        <Card className="flex flex-col gap-3">
          <CardTitle>{t.login.loginSection}</CardTitle>
          <form
            className="flex flex-col gap-3"
            onSubmit={loginForm.handleSubmit((v) => void login(v))}
          >
            <Label>
              {t.common.server}
              <Select {...loginForm.register('serverId')}>
                <option value="">{t.login.selectServer}</option>
                {servers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.health ?? t.common.unknown})
                  </option>
                ))}
              </Select>
            </Label>
            <Label>
              {t.login.softUsername}
              <Input {...loginForm.register('username')} />
            </Label>
            <Label>
              {t.login.softPassword}
              <Input type="password" {...loginForm.register('password')} />
            </Label>
            <Label>
              {t.login.extensionOverride}
              <Input {...loginForm.register('extension')} placeholder={t.login.extensionHint} />
            </Label>
            <Label>
              {t.login.displayName}
              <Input {...loginForm.register('name')} />
            </Label>
            <Button type="submit" variant="primary">
              {t.login.loginBtn}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
