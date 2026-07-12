/**
 * Credential encryption using Electron safeStorage (OS keychain-backed when available).
 * Falls back to base64 obfuscation only when safeStorage is unavailable (dev/CI).
 */

import { safeStorage } from 'electron'

export function encryptSecret(plain: string): string {
  if (!plain) return ''
  if (safeStorage.isEncryptionAvailable()) {
    return `safe:${safeStorage.encryptString(plain).toString('base64')}`
  }
  return `b64:${Buffer.from(plain, 'utf8').toString('base64')}`
}

export function decryptSecret(stored: string | undefined | null): string {
  if (!stored) return ''
  if (stored.startsWith('safe:')) {
    const buf = Buffer.from(stored.slice(5), 'base64')
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(buf)
    }
    return ''
  }
  if (stored.startsWith('b64:')) {
    return Buffer.from(stored.slice(4), 'base64').toString('utf8')
  }
  // Legacy plaintext migration path
  return stored
}

export function hashPassword(password: string, salt: string): string {
  const crypto = require('crypto') as typeof import('crypto')
  return crypto.scryptSync(password, salt, 64).toString('hex')
}

export function createSalt(): string {
  const crypto = require('crypto') as typeof import('crypto')
  return crypto.randomBytes(16).toString('hex')
}

export function verifyPassword(password: string, salt: string, hash: string): boolean {
  const next = hashPassword(password, salt)
  const crypto = require('crypto') as typeof import('crypto')
  const a = Buffer.from(next)
  const b = Buffer.from(hash)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}
