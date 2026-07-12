import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client/bridge'
import { useAppStore } from '@/stores/appStore'
import { useI18n } from '@/i18n'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Input, Label, Select } from '@/components/ui/input'
import type { UserRole } from '@shared/types'

export function UsersAdminPage() {
  const { t, lang } = useI18n()
  const session = useAppStore((s) => s.session)
  const showToast = useAppStore((s) => s.showToast)
  const queryClient = useQueryClient()
  const { data: users = [] } = useQuery({
    queryKey: ['app-users'],
    queryFn: () => api.bridge.users.list()
  })
  const [form, setForm] = useState({
    fullName: '',
    username: '',
    password: '',
    extension: '',
    role: 'agent' as UserRole
  })

  if (session?.role !== 'admin') {
    return <Card>{t.users.adminOnly}</Card>
  }

  const locale = lang === 'fa' ? 'fa-IR' : undefined

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardTitle>{t.users.title}</CardTitle>
        <CardDescription>{t.users.subtitle}</CardDescription>
      </Card>

      <Card className="grid gap-3 md:grid-cols-2">
        <Label>
          {t.users.fullName}
          <Input
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          />
        </Label>
        <Label>
          {t.common.username}
          <Input
            dir="ltr"
            className="text-left"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
        </Label>
        <Label>
          {t.common.password}
          <Input
            type="password"
            dir="ltr"
            className="text-left"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </Label>
        <Label>
          {t.common.extension}
          <Input
            dir="ltr"
            className="text-left"
            value={form.extension}
            onChange={(e) => setForm({ ...form, extension: e.target.value })}
          />
        </Label>
        <Label>
          {t.common.role}
          <Select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
          >
            <option value="agent">{t.common.agent}</option>
            <option value="admin">{t.common.admin}</option>
          </Select>
        </Label>
        <div className="flex items-end">
          <Button
            variant="primary"
            onClick={() =>
              void api.bridge.users
                .save(form)
                .then(async () => {
                  await queryClient.invalidateQueries({ queryKey: ['app-users'] })
                  showToast(t.users.saved, 'success')
                  setForm({
                    fullName: '',
                    username: '',
                    password: '',
                    extension: '',
                    role: 'agent'
                  })
                })
                .catch((e) => showToast(e.message, 'error'))
            }
          >
            {t.users.create}
          </Button>
        </div>
      </Card>

      <Card>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-[var(--color-muted)]">
              <th className="border-b border-[var(--color-border)] p-2">{t.common.name}</th>
              <th className="border-b border-[var(--color-border)] p-2">{t.common.username}</th>
              <th className="border-b border-[var(--color-border)] p-2">{t.common.extension}</th>
              <th className="border-b border-[var(--color-border)] p-2">{t.common.role}</th>
              <th className="border-b border-[var(--color-border)] p-2">{t.users.lastLogin}</th>
              <th className="border-b border-[var(--color-border)] p-2" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="border-b border-[var(--color-border)] p-2">{u.fullName}</td>
                <td className="border-b border-[var(--color-border)] p-2" dir="ltr">
                  {u.username}
                </td>
                <td className="border-b border-[var(--color-border)] p-2" dir="ltr">
                  {u.extension}
                </td>
                <td className="border-b border-[var(--color-border)] p-2">
                  {u.role === 'admin' ? t.common.admin : t.common.agent}
                </td>
                <td className="border-b border-[var(--color-border)] p-2">
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString(locale) : '—'}
                </td>
                <td className="border-b border-[var(--color-border)] p-2">
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={u.username === 'admin'}
                    onClick={() =>
                      void api.bridge.users.delete(u.id).then(async () => {
                        await queryClient.invalidateQueries({ queryKey: ['app-users'] })
                        showToast(t.users.deleted, 'info')
                      })
                    }
                  >
                    {t.common.delete}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
