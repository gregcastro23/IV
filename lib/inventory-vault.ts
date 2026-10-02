import { z } from 'zod'
import { createInventorySession, entryCount, inventorySessionSchema, SESSION_STORAGE_KEY } from './inventory-sessions'
import { backfillMoments, momentSchema } from './moments'

// Key hierarchy (vault format 2):
//   data key (random AES-256-GCM)  ── encrypts the inventory
//     ├─ wrapped by the recovery key or passphrase (PBKDF2-SHA-256, 600k)      · in the vault and backups
//     ├─ wrapped by each device passkey (WebAuthn PRF output → HKDF-SHA-256)   · in the vault and backups
//     └─ wrapped by an optional PIN (PBKDF2-SHA-256, 600k, 5 attempts)          · this browser only, never in backups
// Format 1 vaults (the passphrase-derived key encrypted the data directly) are read and upgraded on unlock.

export const VAULT_STORAGE_KEY = 'fourthstep_vault_v1'
export const PIN_STORAGE_KEY = 'fourthstep_pin_v1'
export const LEGACY_KEYS = [SESSION_STORAGE_KEY, 'inventory_resentments', 'inventory_fears', 'inventory_harms', 'inventory_halt_logs', 'inventory_daily_tasks', 'inventory_contacts', 'inventory_pin_hash', 'inventory_asset_logs', 'inventory_password_hash'] as const
export const MIN_PASSPHRASE_LENGTH = 12
export const PIN_ATTEMPTS = 5
const ITERATIONS = 600_000
const MAX_BYTES = 32 * 1024 * 1024
const RECOVERY_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

const contactSchema = z.object({ id: z.string().min(1), name: z.string(), phone: z.string(), role: z.string() })
const reviewSchema = inventorySessionSchema.pick({ halt: true, resentments: true, fears: true, harms: true, assets: true, reflection: true, nextStep: true })
export const settingsSchema = z.object({ checkInOnOpen: z.boolean(), backgroundLockMinutes: z.union([z.literal(1), z.literal(5), z.literal(15)]) }).strict()
export type VaultSettings = z.infer<typeof settingsSchema>
export const DEFAULT_SETTINGS: VaultSettings = { checkInOnOpen: true, backgroundLockMinutes: 5 }
const dataV1Schema = z.object({ version: z.literal(1), sessions: z.array(inventorySessionSchema), legacy: reviewSchema.nullable(), contacts: z.array(contactSchema), legacyArchive: z.record(z.string()) }).strict()
const dataSchema = dataV1Schema.extend({ version: z.literal(2), moments: z.array(momentSchema), settings: settingsSchema }).strict()
export type VaultData = z.infer<typeof dataSchema>
export type VaultEnvironment = { storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>; crypto: Crypto; exclusive?: <T>(task: () => Promise<T>) => Promise<T> }

const base64 = z.string().regex(/^[A-Za-z0-9+/]+={0,2}$/)
const base64Url = z.string().regex(/^[A-Za-z0-9_-]+$/)
const encode = (bytes: Uint8Array) => { let value = ''; for (let index = 0; index < bytes.length; index += 0x8000) value += String.fromCharCode(...bytes.subarray(index, index + 0x8000)); return btoa(value) }
const decode = (value: string) => Uint8Array.from(atob(value), char => char.charCodeAt(0))
export const toBase64Url = (bytes: Uint8Array) => encode(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
export const fromBase64Url = (value: string) => decode(value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4))
const sized = (length: number) => base64.refine(value => { try { return decode(value).length === length } catch { return false } })
const utf8 = (value: string) => new TextEncoder().encode(value)
const clone = <T>(value: T): T => structuredClone(value)

const kdfSchema = z.object({ name: z.literal('PBKDF2'), hash: z.literal('SHA-256'), iterations: z.literal(ITERATIONS), salt: sized(16) }).strict()
const v1Schema = z.object({
  format: z.literal('fourthstep-vault'), version: z.literal(1), id: z.string().uuid(), kdf: kdfSchema,
  cipher: z.object({ name: z.literal('AES-GCM'), iv: sized(12) }).strict(), ciphertext: base64.min(24),
}).strict()
const recoverySlotSchema = z.object({ kind: z.literal('recovery'), secret: z.enum(['generated', 'passphrase']), kdf: kdfSchema, iv: sized(12), wrapped: sized(48) }).strict()
const passkeySlotSchema = z.object({
  kind: z.literal('passkey'), credentialId: base64Url.min(16).max(1400), rpId: z.string().min(1).max(253), prfSalt: sized(32),
  label: z.string().max(80), createdAt: z.number().finite().nonnegative(), iv: sized(12), wrapped: sized(48),
}).strict()
const slotSchema = z.discriminatedUnion('kind', [recoverySlotSchema, passkeySlotSchema])
const v2Schema = z.object({
  format: z.literal('fourthstep-vault'), version: z.literal(2), id: z.string().uuid(),
  slots: z.array(slotSchema).min(1).max(16).refine(slots => slots.filter(slot => slot.kind === 'recovery').length === 1, 'One recovery slot is required'),
  cipher: z.object({ name: z.literal('AES-GCM'), iv: sized(12), encoding: z.enum(['gzip', 'json']) }).strict(), ciphertext: base64.min(24),
}).strict()
const pinSchema = z.object({
  format: z.literal('fourthstep-pin'), version: z.literal(1), vaultId: z.string().uuid(), length: z.number().int().min(6).max(12),
  kdf: kdfSchema, iv: sized(12), wrapped: sized(48), failures: z.number().int().min(0).max(PIN_ATTEMPTS),
}).strict()
type EnvelopeV1 = z.infer<typeof v1Schema>
type EnvelopeV2 = z.infer<typeof v2Schema>
type Slot = z.infer<typeof slotSchema>
type RecoverySlot = z.infer<typeof recoverySlotSchema>
type PasskeySlot = z.infer<typeof passkeySlotSchema>
type PinRecord = z.infer<typeof pinSchema>
type Wrap = { iv: string; wrapped: string }
type Keeper = { kek: CryptoKey; wrap: Wrap; aad: Uint8Array }
type Opened = { dek: CryptoKey; keeper: Keeper }
export type RecoveryKind = RecoverySlot['secret']
export type UnlockMethod = { kind: 'recovery'; secret: string } | { kind: 'passkey'; credentialId: string; prf: Uint8Array } | { kind: 'pin'; pin: string }
export type PasskeyInfo = Pick<PasskeySlot, 'credentialId' | 'rpId' | 'label' | 'createdAt'> & { prfSalt: Uint8Array }
export type VaultDescription = { id: string; storedVersion: 1 | 2; recovery: RecoveryKind; passkeys: PasskeyInfo[] }

const WRONG_SECRET = 'The passphrase does not match, or this vault has been damaged. No saved data was changed.'
const DAMAGED = 'This vault has been damaged and cannot be decrypted. No saved data was changed.'
const emptyData = (): VaultData => ({ version: 2, sessions: [], legacy: null, contacts: [], legacyArchive: {}, moments: [], settings: { ...DEFAULT_SETTINGS } })

export function browserVaultEnvironment(): VaultEnvironment {
  if (!globalThis.crypto?.subtle) throw new Error('This browser cannot open an encrypted vault. Use a current browser over HTTPS, or the offline edition.')
  const storage = window.localStorage
  const probe = `fourthstep_storage_probe_${globalThis.crypto.randomUUID()}`
  storage.setItem(probe, '1'); storage.removeItem(probe)
  return { storage, crypto: globalThis.crypto, exclusive: navigator.locks ? task => navigator.locks.request('fourthstep-vault-write', task) : undefined }
}
export function readVault(env: VaultEnvironment): string | null { return env.storage.getItem(VAULT_STORAGE_KEY) }
export function hasLegacyData(env: VaultEnvironment): boolean { return LEGACY_KEYS.some(key => env.storage.getItem(key) !== null) }

/** 100 random bits as five groups of Crockford base32, e.g. `7KQF-2M9X-HB4R-T6PW-3NJD`. */
export function generateRecoveryKey(crypto: Crypto): string {
  const characters = Array.from(crypto.getRandomValues(new Uint8Array(20)), byte => RECOVERY_ALPHABET[byte & 31])
  return Array.from({ length: 5 }, (_, group) => characters.slice(group * 4, group * 4 + 4).join('')).join('-')
}
/** Accepts lower case, spaces, and the letters people commonly confuse with digits. */
export function normalizeRecoveryKey(input: string): string { return input.toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1') }
export function isRecoveryKey(input: string): boolean { return /^[0-9A-HJKMNP-TV-Z]{20}$/.test(normalizeRecoveryKey(input)) }
function secretBytes(secret: string, kind: RecoveryKind | 'v1' | 'pin'): Uint8Array {
  return utf8(kind === 'generated' ? normalizeRecoveryKey(secret) : kind === 'passphrase' ? secret.normalize('NFC') : secret)
}
export function validatePassphrase(passphrase: string): string | null {
  if (passphrase.length < MIN_PASSPHRASE_LENGTH) return `Use at least ${MIN_PASSPHRASE_LENGTH} characters. A short sentence works well.`
  if (/^(.)\1+$/.test(passphrase) || /^(?:0123456789|1234567890|password|qwerty)/i.test(passphrase)) return 'Choose something less predictable.'
  return null
}

// Header bytes are authenticated, so they must serialise identically every time.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(',')}}`
  return JSON.stringify(value)
}
const headerV1 = ({ ciphertext: _, ...rest }: EnvelopeV1) => utf8(JSON.stringify(rest))
const headerV2 = ({ ciphertext: _, ...rest }: EnvelopeV2) => utf8(canonical(rest))
const slotAad = (vaultId: string, slot: { kind: 'recovery' | 'pin' } | { kind: 'passkey'; credentialId: string }) =>
  utf8(`fourthstep-vault-slot:${vaultId}:${slot.kind}:${slot.kind === 'passkey' ? slot.credentialId : slot.kind}`)

function parseEnvelope(raw: string): EnvelopeV1 | EnvelopeV2 {
  if (raw.length > MAX_BYTES) throw new Error('This vault is too large to open safely (32 MB limit). The original is preserved.')
  try {
    const value = JSON.parse(raw)
    return value?.version === 1 ? v1Schema.parse(value) : v2Schema.parse(value)
  } catch { throw new Error('This file is damaged or uses an unsupported vault version. The original is preserved.') }
}
export function describeVault(raw: string): VaultDescription {
  const envelope = parseEnvelope(raw)
  if (envelope.version === 1) return { id: envelope.id, storedVersion: 1, recovery: 'passphrase', passkeys: [] }
  return { id: envelope.id, storedVersion: 2, recovery: recoverySlot(envelope.slots).secret, passkeys: passkeyInfo(envelope.slots) }
}
const recoverySlot = (slots: Slot[]) => slots.find((slot): slot is RecoverySlot => slot.kind === 'recovery')!
const passkeyInfo = (slots: Slot[]): PasskeyInfo[] => slots.filter((slot): slot is PasskeySlot => slot.kind === 'passkey')
  .map(({ credentialId, rpId, label, createdAt, prfSalt }) => ({ credentialId, rpId, label, createdAt, prfSalt: decode(prfSalt) }))

async function secretKek(secret: Uint8Array, kdf: z.infer<typeof kdfSchema>, env: VaultEnvironment, usages: KeyUsage[]): Promise<CryptoKey> {
  const material = await env.crypto.subtle.importKey('raw', secret, 'PBKDF2', false, ['deriveKey'])
  return env.crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', iterations: ITERATIONS, salt: decode(kdf.salt) }, material, { name: 'AES-GCM', length: 256 }, false, usages)
}
async function passkeyKek(prf: Uint8Array, prfSalt: string, env: VaultEnvironment): Promise<CryptoKey> {
  if (prf.length < 32) throw new Error('This passkey did not return a usable key.')
  const material = await env.crypto.subtle.importKey('raw', prf, 'HKDF', false, ['deriveKey'])
  return env.crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: decode(prfSalt), info: utf8('fourthstep vault passkey key v2') }, material, { name: 'AES-GCM', length: 256 }, false, ['wrapKey', 'unwrapKey'])
}
async function wrapKey(dek: CryptoKey, kek: CryptoKey, aad: Uint8Array, env: VaultEnvironment): Promise<Wrap> {
  const iv = env.crypto.getRandomValues(new Uint8Array(12))
  const wrapped = await env.crypto.subtle.wrapKey('raw', dek, kek, { name: 'AES-GCM', iv, additionalData: aad, tagLength: 128 })
  return { iv: encode(iv), wrapped: encode(new Uint8Array(wrapped)) }
}
async function unwrapKey(wrap: Wrap, kek: CryptoKey, aad: Uint8Array, env: VaultEnvironment, extractable = false): Promise<CryptoKey> {
  try { return await env.crypto.subtle.unwrapKey('raw', decode(wrap.wrapped), kek, { name: 'AES-GCM', iv: decode(wrap.iv), additionalData: aad, tagLength: 128 }, { name: 'AES-GCM' }, extractable, ['encrypt', 'decrypt']) }
  catch { throw new Error(WRONG_SECRET) }
}
async function newSalt(env: VaultEnvironment) { return { name: 'PBKDF2' as const, hash: 'SHA-256' as const, iterations: ITERATIONS as typeof ITERATIONS, salt: encode(env.crypto.getRandomValues(new Uint8Array(16))) } }

async function transform(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer())
}
async function encrypt(data: VaultData, dek: CryptoKey, id: string, slots: Slot[], env: VaultEnvironment): Promise<string> {
  const json = utf8(JSON.stringify(dataSchema.parse(data)))
  const gzip = typeof CompressionStream === 'function'
  const plaintext = gzip ? await transform(json, new CompressionStream('gzip')) : json
  const envelope: EnvelopeV2 = { format: 'fourthstep-vault', version: 2, id, slots, cipher: { name: 'AES-GCM', iv: encode(env.crypto.getRandomValues(new Uint8Array(12))), encoding: gzip ? 'gzip' : 'json' }, ciphertext: '' }
  const ciphertext = await env.crypto.subtle.encrypt({ name: 'AES-GCM', iv: decode(envelope.cipher.iv), additionalData: headerV2(envelope), tagLength: 128 }, dek, plaintext)
  envelope.ciphertext = encode(new Uint8Array(ciphertext))
  const raw = JSON.stringify(envelope)
  if (raw.length > MAX_BYTES) throw new Error('The encrypted vault exceeds 32 MB. Export a backup and keep this page open.')
  return raw
}
async function decrypt(envelope: EnvelopeV1 | EnvelopeV2, key: CryptoKey, env: VaultEnvironment): Promise<VaultData> {
  let plaintext: Uint8Array
  try {
    const header = envelope.version === 1 ? headerV1(envelope) : headerV2(envelope)
    plaintext = new Uint8Array(await env.crypto.subtle.decrypt({ name: 'AES-GCM', iv: decode(envelope.cipher.iv), additionalData: header, tagLength: 128 }, key, decode(envelope.ciphertext)))
    if (envelope.version === 2 && envelope.cipher.encoding === 'gzip') {
      if (typeof DecompressionStream !== 'function') throw new Error('unsupported')
      plaintext = await transform(plaintext, new DecompressionStream('gzip'))
    }
  } catch (cause) {
    if (cause instanceof Error && cause.message === 'unsupported') throw new Error('This browser is too old to open this vault. Update your browser; no saved data was changed.')
    throw new Error(envelope.version === 1 ? WRONG_SECRET : DAMAGED)
  }
  return upgradeData(JSON.parse(new TextDecoder().decode(plaintext)))
}
function upgradeData(value: unknown): VaultData {
  const current = dataSchema.safeParse(value)
  if (current.success) return current.data
  const v1 = dataV1Schema.safeParse(value)
  if (v1.success) return { ...v1.data, version: 2, moments: backfillMoments(v1.data.sessions, v1.data.legacyArchive.inventory_halt_logs), settings: { ...DEFAULT_SETTINGS } }
  throw new Error('This vault was saved by a newer or incompatible version of Fourth Step. Update the app; no saved data was changed.')
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
    data.moments = backfillMoments(data.sessions, data.legacyArchive.inventory_halt_logs)
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

function readPin(env: VaultEnvironment, vaultId: string): PinRecord | null {
  try {
    const raw = env.storage.getItem(PIN_STORAGE_KEY)
    if (raw === null) return null
    const record = pinSchema.parse(JSON.parse(raw))
    return record.vaultId === vaultId && record.failures < PIN_ATTEMPTS ? record : null
  } catch { return null }
}
/** PIN unlock is a convenience stored only in this browser. It is never part of a backup. */
export function pinStatus(env: VaultEnvironment, vaultId: string): { length: number; attemptsLeft: number } | null {
  const record = readPin(env, vaultId)
  return record ? { length: record.length, attemptsLeft: PIN_ATTEMPTS - record.failures } : null
}

async function openSlot(method: UnlockMethod, id: string, slots: Slot[], env: VaultEnvironment, allowPin: boolean): Promise<Opened> {
  if (method.kind === 'recovery') {
    const slot = recoverySlot(slots)
    const kek = await secretKek(secretBytes(method.secret, slot.secret), slot.kdf, env, ['wrapKey', 'unwrapKey'])
    const aad = slotAad(id, slot)
    return { dek: await unwrapKey(slot, kek, aad, env), keeper: { kek, wrap: slot, aad } }
  }
  if (method.kind === 'passkey') {
    const slot = slots.find((item): item is PasskeySlot => item.kind === 'passkey' && item.credentialId === method.credentialId)
    if (!slot) throw new Error('This passkey is not set up for this vault. Use your recovery key instead.')
    const kek = await passkeyKek(method.prf, slot.prfSalt, env)
    const aad = slotAad(id, slot)
    try { return { dek: await unwrapKey(slot, kek, aad, env), keeper: { kek, wrap: slot, aad } } }
    catch { throw new Error('This device could not unlock the vault. Use your recovery key instead; no saved data was changed.') }
  }
  const record = allowPin ? readPin(env, id) : null
  if (!record) throw new Error('PIN unlock is not set up in this browser. Use your recovery key.')
  const kek = await secretKek(secretBytes(method.pin, 'pin'), record.kdf, env, ['wrapKey', 'unwrapKey'])
  const aad = slotAad(id, { kind: 'pin' })
  try {
    const dek = await unwrapKey(record, kek, aad, env)
    if (record.failures) env.storage.setItem(PIN_STORAGE_KEY, JSON.stringify({ ...record, failures: 0 }))
    return { dek, keeper: { kek, wrap: record, aad } }
  } catch {
    const failures = record.failures + 1
    if (failures >= PIN_ATTEMPTS) {
      env.storage.removeItem(PIN_STORAGE_KEY)
      throw new Error('Too many incorrect PINs, so PIN unlock has been turned off. Use your recovery key or device unlock.')
    }
    env.storage.setItem(PIN_STORAGE_KEY, JSON.stringify({ ...record, failures }))
    const left = PIN_ATTEMPTS - failures
    throw new Error(`That PIN is not correct. ${left} ${left === 1 ? 'attempt' : 'attempts'} left before PIN unlock turns off.`)
  }
}

export interface InventoryVault {
  snapshot(): VaultData
  update(change: (data: VaultData) => VaultData): Promise<void>
  backup(): Promise<string>
  cleanup(): string[]
  close(): void
  describe(): VaultDescription & { pin: { length: number; attemptsLeft: number } | null }
  /** Re-checks an unlock method without changing anything, before sensitive changes. */
  verify(method: UnlockMethod): Promise<void>
  addPasskey(passkey: { credentialId: string; rpId: string; prfSalt: Uint8Array; label: string }, prf: Uint8Array): Promise<void>
  removePasskey(credentialId: string): Promise<void>
  replaceRecovery(secret: string, kind: RecoveryKind): Promise<void>
  setPin(pin: string): Promise<void>
  removePin(): void
}
function session(initial: VaultData, opened: Opened, id: string, initialSlots: Slot[], initialRaw: string, env: VaultEnvironment): InventoryVault {
  let state: { data: VaultData } & Opened | null = { data: clone(initial), ...opened }
  let slots = initialSlots
  let expected = initialRaw
  let storedVersion: 1 | 2 = parseEnvelope(initialRaw).version
  let queue = Promise.resolve()
  const requireOpen = () => { if (!state) throw new Error('This vault is locked.'); return state }
  const exclusive = <T>(task: () => Promise<T>) => env.exclusive ? env.exclusive(task) : task()
  const exportable = () => { const { keeper } = requireOpen(); return unwrapKey(keeper.wrap, keeper.kek, keeper.aad, env, true) }
  const write = (candidate: () => { data: VaultData; slots: Slot[] }) => {
    const operation = queue.then(() => exclusive(async () => {
      const current = requireOpen()
      const next = candidate()
      const raw = await encrypt(next.data, current.dek, id, next.slots, env)
      requireOpen()
      if (readVault(env) !== expected) throw new Error('The vault changed in another tab. Keep this page open, download an encrypted backup of these changes, then reopen the vault. Your changes were not written over the other tab.')
      try { env.storage.setItem(VAULT_STORAGE_KEY, raw) }
      catch { throw new Error('Browser storage is full or unavailable. Keep this page open and download an encrypted backup of your changes.') }
      if (readVault(env) !== raw) throw new Error('The encrypted save could not be verified. Keep this page open and download a backup.')
      expected = raw; slots = next.slots; storedVersion = 2
    }))
    queue = operation.catch(() => {})
    return operation
  }
  const changeSlots = (change: (slots: Slot[]) => Slot[]) => write(() => ({ data: clone(requireOpen().data), slots: v2Schema.shape.slots.parse(change(slots)) }))
  return {
    snapshot: () => clone(requireOpen().data),
    update(change) {
      const current = requireOpen()
      current.data = dataSchema.parse(change(clone(current.data)))
      const candidate = clone(current.data)
      return write(() => ({ data: candidate, slots }))
    },
    async backup() { await queue; const current = requireOpen(); return encrypt(current.data, current.dek, id, slots, env) },
    cleanup() {
      const current = requireOpen()
      if (readVault(env) !== expected) return LEGACY_KEYS.filter(k => env.storage.getItem(k) !== null)
      return removeMigratedPlaintext(current.data, env)
    },
    close() { state = null },
    describe: () => ({ id, storedVersion, recovery: recoverySlot(slots).secret, passkeys: passkeyInfo(slots), pin: pinStatus(env, id) }),
    async verify(method) { requireOpen(); await openSlot(method, id, slots, env, true) },
    async addPasskey(passkey, prf) {
      if (passkeyInfo(slots).length >= 10) throw new Error('Ten devices are already set up. Remove one before adding another.')
      const prfSalt = encode(passkey.prfSalt)
      const kek = await passkeyKek(prf, prfSalt, env)
      const aad = slotAad(id, { kind: 'passkey', credentialId: passkey.credentialId })
      const wrap = await wrapKey(await exportable(), kek, aad, env)
      await unwrapKey(wrap, kek, aad, env)
      const slot = passkeySlotSchema.parse({ kind: 'passkey', credentialId: passkey.credentialId, rpId: passkey.rpId, prfSalt, label: passkey.label.slice(0, 80), createdAt: Date.now(), ...wrap })
      await changeSlots(current => [...current.filter(item => item.kind !== 'passkey' || item.credentialId !== slot.credentialId), slot])
    },
    removePasskey: credentialId => changeSlots(current => current.filter(item => item.kind !== 'passkey' || item.credentialId !== credentialId)),
    async replaceRecovery(secret, kind) {
      if (kind === 'generated' && !isRecoveryKey(secret)) throw new Error('That recovery key is not in the expected format.')
      const problem = kind === 'passphrase' ? validatePassphrase(secret) : null
      if (problem) throw new Error(problem)
      const kdf = await newSalt(env)
      const kek = await secretKek(secretBytes(secret, kind), kdf, env, ['wrapKey', 'unwrapKey'])
      const aad = slotAad(id, { kind: 'recovery' })
      const wrap = await wrapKey(await exportable(), kek, aad, env)
      await unwrapKey(wrap, kek, aad, env)
      await changeSlots(current => current.map(item => item.kind === 'recovery' ? { kind: 'recovery', secret: kind, kdf, ...wrap } : item))
    },
    async setPin(pin) {
      if (!/^\d{6,12}$/.test(pin)) throw new Error('Use 6 to 12 digits for your PIN.')
      if (/^(\d)\1+$/.test(pin) || '0123456789012'.includes(pin) || '9876543210987'.includes(pin)) throw new Error('Choose a PIN that is harder to guess than a repeated or sequential number.')
      const kdf = await newSalt(env)
      const kek = await secretKek(secretBytes(pin, 'pin'), kdf, env, ['wrapKey', 'unwrapKey'])
      const aad = slotAad(id, { kind: 'pin' })
      const wrap = await wrapKey(await exportable(), kek, aad, env)
      await unwrapKey(wrap, kek, aad, env)
      const record: PinRecord = { format: 'fourthstep-pin', version: 1, vaultId: id, length: pin.length, kdf, ...wrap, failures: 0 }
      try { env.storage.setItem(PIN_STORAGE_KEY, JSON.stringify(record)) } catch { throw new Error('Browser storage is full or unavailable, so the PIN was not saved.') }
    },
    removePin() { env.storage.removeItem(PIN_STORAGE_KEY) },
  }
}

async function newRecoverySlot(dek: CryptoKey, secret: string, kind: RecoveryKind, id: string, env: VaultEnvironment) {
  const kdf = await newSalt(env)
  const kek = await secretKek(secretBytes(secret, kind), kdf, env, ['wrapKey', 'unwrapKey'])
  const aad = slotAad(id, { kind: 'recovery' })
  const wrap = await wrapKey(dek, kek, aad, env)
  const slot: RecoverySlot = { kind: 'recovery', secret: kind, kdf, ...wrap }
  return { slot, opened: { dek: await unwrapKey(wrap, kek, aad, env), keeper: { kek, wrap, aad } } }
}
const generateDek = (env: VaultEnvironment) => env.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])

export async function createVault(secret: string, env: VaultEnvironment, kind: RecoveryKind = 'passphrase'): Promise<InventoryVault> {
  if (kind === 'passphrase') { const problem = validatePassphrase(secret); if (problem) throw new Error(problem) }
  if (kind === 'generated' && !isRecoveryKey(secret)) throw new Error('That recovery key is not in the expected format.')
  const original = readVault(env)
  if (original !== null) throw new Error('An encrypted vault already exists. Unlock it instead.')
  const data = migrateData(env)
  const id = env.crypto.randomUUID()
  const { slot, opened } = await newRecoverySlot(await generateDek(env), secret, kind, id, env)
  const raw = await encrypt(data, opened.dek, id, [slot], env)
  // Verify before writing, and again before deleting any plaintext originals.
  await decrypt(parseEnvelope(raw), opened.dek, env)
  const write = async () => {
    if (readVault(env) !== original || LEGACY_KEYS.some(k => env.storage.getItem(k) !== (data.legacyArchive[k] ?? null))) throw new Error('Saved data changed during setup. Close other inventory tabs and try again.')
    env.storage.setItem(VAULT_STORAGE_KEY, raw)
    const saved = readVault(env)
    if (saved !== raw) throw new Error('The encrypted copy could not be verified. Original answers are preserved.')
    await decrypt(parseEnvelope(saved), opened.dek, env)
  }
  if (env.exclusive) await env.exclusive(write); else await write()
  return session(data, opened, id, [slot], raw, env)
}

export async function unlockVault(method: UnlockMethod | string, env: VaultEnvironment, backup?: string): Promise<InventoryVault> {
  const unlock: UnlockMethod = typeof method === 'string' ? { kind: 'recovery', secret: method } : method
  const raw = backup ?? readVault(env)
  if (!raw) throw new Error('No encrypted vault was found.')
  const envelope = parseEnvelope(raw)
  let opened: Opened, slots: Slot[], data: VaultData
  if (envelope.version === 1) {
    // Format 1 used the passphrase-derived key directly. Re-key under a new random data key; the
    // first save after unlocking replaces the stored copy.
    if (unlock.kind !== 'recovery') throw new Error('Use your passphrase to open this vault.')
    const legacyKey = await secretKek(secretBytes(unlock.secret, 'v1'), envelope.kdf, env, ['encrypt', 'decrypt'])
    data = await decrypt(envelope, legacyKey, env)
    const created = await newRecoverySlot(await generateDek(env), unlock.secret, 'passphrase', envelope.id, env)
    opened = created.opened; slots = [created.slot]
  } else {
    opened = await openSlot(unlock, envelope.id, envelope.slots, env, backup === undefined)
    data = await decrypt(envelope, opened.dek, env)
    slots = envelope.slots
  }
  if (backup !== undefined) {
    const restore = async () => {
      if (readVault(env) !== null || hasLegacyData(env)) throw new Error('This browser already contains inventory data. Restore into an empty browser profile or the offline edition to keep both copies.')
      env.storage.setItem(VAULT_STORAGE_KEY, raw)
      if (readVault(env) !== raw) throw new Error('The restored copy could not be verified.')
    }
    if (env.exclusive) await env.exclusive(restore); else await restore()
  }
  return session(data, opened, envelope.id, slots, raw, env)
}
