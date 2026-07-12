import { contactSchema, loginSchema, originateSchema, serverSchema } from '../validation/schemas'
import { callRepository, contactsRepository, queuesRepository, serversRepository } from '../repositories'
import type { Contact, ServerConfig } from '@shared/types'

/**
 * Services compose validation + repositories.
 * UI should call services rather than repositories when business rules apply.
 */

export const authService = {
  async login(input: { serverId: string; extension: string; name?: string }) {
    const parsed = loginSchema.parse(input)
    return apiLogin(parsed)
  }
}

async function apiLogin(parsed: { serverId: string; extension: string; name?: string }) {
  const { api } = await import('../client/bridge')
  return api.bridge.auth.login(parsed)
}

export const serverService = {
  async saveAndTest(input: unknown) {
    const parsed = serverSchema.parse(input)
    const server: ServerConfig = {
      id: (input as { id?: string }).id ?? crypto.randomUUID(),
      name: parsed.name,
      baseUrl: parsed.baseUrl,
      apiPath: parsed.apiPath,
      apiKey: parsed.apiKey,
      username: parsed.username,
      password: parsed.password,
      isDefault: parsed.isDefault,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    await serversRepository.test(server)
    return serversRepository.save(server)
  }
}

export const contactService = {
  async save(input: unknown) {
    const parsed = contactSchema.parse(input)
    const contact: Contact = {
      id: (input as { id?: string }).id ?? crypto.randomUUID(),
      name: parsed.name,
      company: parsed.company,
      email: parsed.email || undefined,
      address: parsed.address,
      numbers: parsed.numbers,
      tags: parsed.tags,
      notes: parsed.notes,
      groupIds: parsed.groupIds,
      isFavorite: parsed.isFavorite,
      source: parsed.source,
      createdAt: (input as { createdAt?: string }).createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    return contactsRepository.save(contact)
  },
  search: (q: string) => contactsRepository.search(q)
}

export const callService = {
  async originate(number: string, trunk?: string) {
    const parsed = originateSchema.parse({ number })
    return callRepository.originate(parsed.number, trunk)
  }
}

export const queueService = {
  list: () => queuesRepository.list(),
  join: (queue: string) => queuesRepository.join(queue),
  leave: (queue: string) => queuesRepository.leave(queue)
}
