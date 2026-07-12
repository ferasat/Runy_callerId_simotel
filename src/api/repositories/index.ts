import type { Contact, QueueInfo, ServerConfig } from '@shared/types'
import { api } from '../client/bridge'

/** Thin repositories that isolate IPC / remote access from UI services. */

export const serversRepository = {
  list: (): Promise<ServerConfig[]> => api.bridge.servers.list(),
  save: (server: ServerConfig) => api.bridge.servers.save(server),
  delete: (id: string) => api.bridge.servers.delete(id),
  test: (server: ServerConfig) => api.bridge.servers.test(server)
}

export const contactsRepository = {
  list: (): Promise<Contact[]> => api.bridge.contacts.list(),
  save: (contact: Contact) => api.bridge.contacts.save(contact),
  delete: (id: string) => api.bridge.contacts.delete(id),
  search: (q: string) => api.bridge.contacts.search(q),
  favorites: () => api.bridge.contacts.favorites()
}

export const queuesRepository = {
  list: (): Promise<QueueInfo[]> => api.bridge.queues.list() as Promise<QueueInfo[]>,
  join: (queue: string) => api.bridge.queues.join(queue),
  leave: (queue: string) => api.bridge.queues.leave(queue),
  pause: (queue: string) => api.bridge.queues.pause(queue),
  resume: (queue: string) => api.bridge.queues.resume(queue)
}

export const callRepository = {
  originate: (number: string, trunk?: string) => api.bridge.call.originate(number, trunk),
  history: (opts?: Record<string, unknown>) => api.bridge.call.history(opts),
  active: () => api.bridge.call.active()
}
