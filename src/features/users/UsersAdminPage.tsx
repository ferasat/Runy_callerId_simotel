import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client/bridge'
import { useAppStore } from '@/stores/appStore'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Input, Label, Select } from '@/components/ui/input'
import type { UserRole } from '@shared/types'

export function UsersAdminPage() {
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
    return <Card>Admin access required</Card>
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardTitle>User Management</CardTitle>
        <CardDescription>
          Admin can create agents with encrypted passwords and role permissions.
        </CardDescription>
      </Card>

      <Card className="grid gap-3 md:grid-cols-2">
        <Label>
          Full name
          <Input
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          />
        </Label>
        <Label>
          Username
          <Input
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
        </Label>
        <Label>
          Password
          <Input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </Label>
        <Label>
          Extension
          <Input
            value={form.extension}
            onChange={(e) => setForm({ ...form, extension: e.target.value })}
          />
        </Label>
        <Label>
          Role
          <Select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
          >
            <option value="agent">Agent</option>
            <option value="admin">Admin</option>
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
                  showToast('User saved', 'success')
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
            Create User
          </Button>
        </div>
      </Card>

      <Card>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-[var(--color-muted)]">
              <th className="border-b border-[var(--color-border)] p-2">Name</th>
              <th className="border-b border-[var(--color-border)] p-2">Username</th>
              <th className="border-b border-[var(--color-border)] p-2">Extension</th>
              <th className="border-b border-[var(--color-border)] p-2">Role</th>
              <th className="border-b border-[var(--color-border)] p-2">Last login</th>
              <th className="border-b border-[var(--color-border)] p-2" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="border-b border-[var(--color-border)] p-2">{u.fullName}</td>
                <td className="border-b border-[var(--color-border)] p-2">{u.username}</td>
                <td className="border-b border-[var(--color-border)] p-2">{u.extension}</td>
                <td className="border-b border-[var(--color-border)] p-2">{u.role}</td>
                <td className="border-b border-[var(--color-border)] p-2">
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : '—'}
                </td>
                <td className="border-b border-[var(--color-border)] p-2">
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={u.username === 'admin'}
                    onClick={() =>
                      void api.bridge.users.delete(u.id).then(async () => {
                        await queryClient.invalidateQueries({ queryKey: ['app-users'] })
                        showToast('Deleted', 'info')
                      })
                    }
                  >
                    Delete
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
