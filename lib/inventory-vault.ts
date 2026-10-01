import { z } from 'zod'
import { createInventorySession, entryCount, inventorySessionSchema, SESSION_STORAGE_KEY } from './inventory-sessions'

export const VAULT_STORAGE_KEY = 'fourthstep_vault_v1'
export const LEGACY_KEYS = [SESSION_STORAGE_KEY, 'inventory_resentments', 'inventory_fears', 'inventory_harms', 'inventory_halt_logs', 'inventory_daily_tasks', 'inventory_contacts', 'inventory_pin_hash', 'inventory_asset_logs', 'inventory_password_hash'] as const
export const MIN_PASSPHRASE_LENGTH = 16
const ITERATIONS = 600_000
const MAX_BYTES = 32 * 1024 * 1024
const contactSchema = z.object({ id: z.string().min(1), name: z.string(), phone: z.string(), role: z.string() })
const reviewSchema = inventorySessionSchema.pick({ halt: true, resentments: true, fears: true, harms: true, assets: true, reflection: true, nextStep: true })
const dataSchema = z.object({ version: z.literal(1), sessions: z.array(inventorySessionSchema), legacy: reviewSchema.nullable(), contacts: z.array(contactSchema), legacyArchive: z.record(z.string()) }).strict()
export type VaultData = z.infer<typeof dataSchema>
export type VaultEnvironment = { storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>; crypto: Crypto; exclusive?: <T>(task: () => Promise<T>) => Promise<T> }
const base64 = z.string().regex(/^[A-Za-z0-9+/]+={0,2}$/)
const envelopeSchema = z.object({
  format: z.literal('fourthstep-vault'), version: z.literal(1), id: z.string().uuid(),
  kdf: z.object({ name: z.literal('PBKDF2'), hash: z.literal('SHA-256'), iterations: z.literal(ITERATIONS), salt: base64.length(24) }).strict(),
  cipher: z.object({ name: z.literal('AES-GCM'), iv: base64.length(16) }).strict(),
  ciphertext: base64.min(24),
}).strict()
type Envelope = z.infer<typeof envelopeSchema>
const encode = (bytes: Uint8Array) => { let value = ''; for (const byte of bytes) value += String.fromCharCode(byte); return btoa(value) }
const decode = (value: string) => Uint8Array.from(atob(value), char => char.charCodeAt(0))
const clone = <T>(value: T): T => structuredClone(value)
const emptyData = (): VaultData => ({ version: 1, sessions: [], legacy: null, contacts: [], legacyArchive: {} })
const header = ({ ciphertext: _, ...rest }: Envelope) => new TextEncoder().encode(JSON.stringify(rest))

export function browserVaultEnvironment(): VaultEnvironment {
  if (!globalThis.crypto?.subtle) throw new Error('This browser cannot open an encrypted vault. Use a current browser over HTTPS, or the offline edition.')
  const storage = window.localStorage
  const probe = `fourthstep_storage_probe_${globalThis.crypto.randomUUID()}`
  storage.setItem(probe, '1'); storage.removeItem(probe)
  return { storage, crypto: globalThis.crypto, exclusive: navigator.locks ? task => navigator.locks.request('fourthstep-vault-write', task) : undefined }
}
export function readVault(env: VaultEnvironment): string | null { return env.storage.getItem(VAULT_STORAGE_KEY) }
export function hasLegacyData(env: VaultEnvironment): boolean { return LEGACY_KEYS.some(key => env.storage.getItem(key) !== null) }
function parseEnvelope(raw: string): Envelope {
  if (raw.length > MAX_BYTES) throw new Error('This vault is too large to open safely (32 MB limit). The original is preserved.')
  try { const value = envelopeSchema.parse(JSON.parse(raw)); if (decode(value.kdf.salt).length !== 16 || decode(value.cipher.iv).length !== 12) throw new Error(); return value }
  catch { throw new Error('This file is damaged or uses an unsupported vault version. The original is preserved.') }
}
async function derive(passphrase: string, envelope: Envelope, env: VaultEnvironment): Promise<CryptoKey> {
  const material = await env.crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey'])
  return env.crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', iterations: ITERATIONS, salt: decode(envelope.kdf.salt) }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}
async function encrypt(data: VaultData, key: CryptoKey, previous: Envelope, env: VaultEnvironment): Promise<string> {
  const envelope = { ...previous, cipher: { name: 'AES-GCM' as const, iv: encode(env.crypto.getRandomValues(new Uint8Array(12))) }, ciphertext: '' }
  const ciphertext = await env.crypto.subtle.encrypt({ name: 'AES-GCM', iv: decode(envelope.cipher.iv), additionalData: header(envelope), tagLength: 128 }, key, new TextEncoder().encode(JSON.stringify(dataSchema.parse(data))))
  envelope.ciphertext = encode(new Uint8Array(ciphertext))
  const raw = JSON.stringify(envelope)
  if (raw.length > MAX_BYTES) throw new Error('The encrypted vault exceeds 32 MB. Export a backup and keep this page open.')
  return raw
}
async function decrypt(envelope: Envelope, key: CryptoKey, env: VaultEnvironment): Promise<VaultData> {
  try {
    const plaintext = await env.crypto.subtle.decrypt({ name: 'AES-GCM', iv: decode(envelope.cipher.iv), additionalData: header(envelope), tagLength: 128 }, key, decode(envelope.ciphertext))
    return dataSchema.parse(JSON.parse(new TextDecoder().decode(plaintext)))
  } catch { throw new Error('The passphrase does not match, or this vault has been damaged. No saved data was changed.') }
}

function migrateData(env: VaultEnvironment): VaultData {
  const data = emptyData()
  for (const key of LEGACY_KEYS) { const raw = env.storage.getItem(key); if (raw !== null) data.legacyArchive[key] = raw }
  const read = (key: string) => key in data.legacyArchive ? JSON.parse(data.legacyArchive[key]) : []
  try {
    data.sessions = z.array(inventorySessionSchema).parse(read(SESSION_STORAGE_KEY))
    const logs = z.array(z.unknown()).parse(read('inventory_halt_logs'))
    const legacy = reviewSchema.parse({
      halt: logs.length ? logs[0] : createInventorySession().halt,
      resentments: read('inventory_resentments'), fears: read('inventory_fears'), harms: read('inventory_harms'), assets: read('inventory_asset_logs'), reflection: '', nextStep: '',
    })
    data.legacy = entryCount(legacy) || logs.length ? legacy : null
    data.contacts = z.array(contactSchema).parse(read('inventory_contacts'))
    return data
  } catch { throw new Error('Some earlier data could not be read. Migration stopped; all original data is still in this browser. Export the original data for recovery before making changes.') }
}

// Delete only originals that are still identical to the verified encrypted archive.
function removeMigratedPlaintext(data: VaultData, env: VaultEnvironment): string[] {
  const remaining: string[] = []
  for (const key of LEGACY_KEYS) {
    try {
      const raw = env.storage.getItem(key)
      if (raw === null) continue
      if (data.legacyArchive[key] === raw) env.storage.removeItem(key)
      if (env.storage.getItem(key) !== null) remaining.push(key)
    } catch { remaining.push(key) }
  }
  return remaining
}

export interface InventoryVault {
  snapshot(): VaultData
  update(change: (data: VaultData) => VaultData): Promise<void>
  backup(): Promise<string>
  cleanup(): string[]
  close(): void
}
function session(initial: VaultData, initialKey: CryptoKey, initialRaw: string, env: VaultEnvironment): InventoryVault {
  let data: VaultData | null = clone(initial)
  let key: CryptoKey | null = initialKey
  let expected = initialRaw
  let queue = Promise.resolve()
  const requireOpen = () => { if (!key || !data) throw new Error('This vault is locked.'); return { key, data } }
  const exclusive = <T>(task: () => Promise<T>) => env.exclusive ? env.exclusive(task) : task()
  return {
    snapshot: () => clone(requireOpen().data),
    update(change) {
      data = dataSchema.parse(change(clone(requireOpen().data)))
      const candidate = clone(data)
      const operation = queue.then(() => exclusive(async () => {
        const current = requireOpen()
        const raw = await encrypt(candidate, current.key, parseEnvelope(expected), env)
        requireOpen()
        if (readVault(env) !== expected) throw new Error('The vault changed in another tab. Keep this page open, download an encrypted backup of these changes, then reopen the vault. Your changes were not written over the other tab.')
        try { env.storage.setItem(VAULT_STORAGE_KEY, raw) }
        catch { throw new Error('Browser storage is full or unavailable. Keep this page open and download an encrypted backup of your changes.') }
        if (readVault(env) !== raw) throw new Error('The encrypted save could not be verified. Keep this page open and download a backup.')
        expected = raw
      }))
      queue = operation.catch(() => {})
      return operation
    },
    async backup() { await queue; const current = requireOpen(); return encrypt(current.data, current.key, parseEnvelope(expected), env) },
    cleanup() {
      const current = requireOpen()
      if (readVault(env) !== expected) return LEGACY_KEYS.filter(k => env.storage.getItem(k) !== null)
      return removeMigratedPlaintext(current.data, env)
    },
    close() { key = null; data = null },
  }
}

export async function createVault(passphrase: string, env: VaultEnvironment): Promise<InventoryVault> {
  if (passphrase.length < MIN_PASSPHRASE_LENGTH) throw new Error('Use at least 16 characters. Four randomly chosen words are easier to remember.')
  const original = readVault(env)
  if (original !== null) throw new Error('An encrypted vault already exists. Unlock it instead.')
  const data = migrateData(env)
  const envelope: Envelope = { format: 'fourthstep-vault', version: 1, id: env.crypto.randomUUID(), kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: ITERATIONS, salt: encode(env.crypto.getRandomValues(new Uint8Array(16))) }, cipher: { name: 'AES-GCM', iv: encode(new Uint8Array(12)) }, ciphertext: '' }
  const key = await derive(passphrase, envelope, env)
  const raw = await encrypt(data, key, envelope, env)
  // Verify before writing, and again before deleting any plaintext originals.
  await decrypt(parseEnvelope(raw), key, env)
  const write = async () => {
    if (readVault(env) !== original || LEGACY_KEYS.some(k => env.storage.getItem(k) !== (data.legacyArchive[k] ?? null))) throw new Error('Saved data changed during setup. Close other inventory tabs and try again.')
    env.storage.setItem(VAULT_STORAGE_KEY, raw)
    const saved = readVault(env)
    if (saved !== raw) throw new Error('The encrypted copy could not be verified. Original answers are preserved.')
    await decrypt(parseEnvelope(saved), key, env)
  }
  if (env.exclusive) await env.exclusive(write); else await write()
  return session(data, key, raw, env)
}
export async function unlockVault(passphrase: string, env: VaultEnvironment, backup?: string): Promise<InventoryVault> {
  const raw = backup ?? readVault(env)
  if (!raw) throw new Error('No encrypted vault was found.')
  const envelope = parseEnvelope(raw)
  const key = await derive(passphrase, envelope, env)
  const data = await decrypt(envelope, key, env)
  if (backup !== undefined) {
    const restore = async () => {
      if (readVault(env) !== null || hasLegacyData(env)) throw new Error('This browser already contains inventory data. Restore into an empty browser profile or the offline edition to keep both copies.')
      env.storage.setItem(VAULT_STORAGE_KEY, raw)
      if (readVault(env) !== raw) throw new Error('The restored copy could not be verified.')
    }
    if (env.exclusive) await env.exclusive(restore); else await restore()
  }
  return session(data, key, raw, env)
}
