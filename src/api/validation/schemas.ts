import { z } from 'zod'

export const serverSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1, 'Name is required'),
  baseUrl: z.string().url('Valid URL required'),
  apiPath: z.string().min(1).default('api/v4'),
  apiAuth: z.enum(['basic', 'token', 'both']).default('both'),
  apiKey: z.string().optional().default(''),
  username: z.string().optional(),
  password: z.string().optional(),
  timeoutMs: z.number().default(15000),
  isDefault: z.boolean().default(false)
})

export const loginSchema = z.object({
  serverId: z.string().min(1),
  extension: z.string().optional(),
  name: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional()
})

export const contactSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  company: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  numbers: z
    .array(
      z.object({
        label: z.string(),
        number: z.string().min(1),
        primary: z.boolean().optional()
      })
    )
    .min(1),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
  groupIds: z.array(z.string()).default([]),
  isFavorite: z.boolean().default(false),
  source: z.enum(['local', 'import', 'crm', 'simotel']).default('local')
})

export const originateSchema = z.object({
  number: z.string().min(2, 'Number required')
})
