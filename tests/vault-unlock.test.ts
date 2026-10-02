import test from 'node:test'
import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'
import {
  createVault, generateRecoveryKey, isRecoveryKey, normalizeRecoveryKey, PIN_STORAGE_KEY, unlockVault, validatePassphrase,
  VAULT_STORAGE_KEY, type VaultEnvironment,
} from '../lib/inventory-vault'
import { advanceSession, createInventorySession } from '../lib/inventory-sessions'

const crypto = webcrypto as unknown as Crypto
const passphrase = 'test-only fixture sentence'
function environment() {
  const values = new Map<string, string>()
  const env: VaultEnvironment = { crypto, storage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value) }, removeItem: key => { values.delete(key) } } }
  return { env, values }
}
const b64 = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64')
const prfFor = (seed: number) => new Uint8Array(32).fill(seed)

// Builds a vault exactly as format 1 wrote it: the passphrase-derived key encrypted the data directly.
async function formatOneVault(secret: string, data: unknown) {
  const salt = crypto.getRandomValues(new Uint8Array(16)); const iv = crypto.getRandomValues(new Uint8Array(12))
  const envelope = { format: 'fourthstep-vault', version: 1, id: crypto.randomUUID(), kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: 600_000, salt: b64(salt) }, cipher: { name: 'AES-GCM', iv: b64(iv) }, ciphertext: '' }
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), 'PBKDF2', false, ['deriveKey'])
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', iterations: 600_000, salt }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt'])
  const { ciphertext: _, ...header } = envelope
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(JSON.stringify(header)), tagLength: 128 }, key, new TextEncoder().encode(JSON.stringify(data)))
  return JSON.stringify({ ...envelope, ciphertext: b64(new Uint8Array(encrypted)) })
}

test('format 1 vaults and backups unlock, gain a timeline from earlier check-ins, and upgrade on the next save', async () => {
  const { env, values } = environment()
  const session = advanceSession(createInventorySession(new Date('2026-09-28T08:15:00Z')))
  session.halt = { hungry: 2, angry: 6, lonely: 4, tired: 7, note: 'Before work' }
  const untouched = createInventorySession(new Date('2026-09-29T08:15:00Z'))
  const logs = JSON.stringify([{ id: 'old', hungry: 3, angry: 8, lonely: 1, tired: 5, note: 'Earlier HALT log', timestamp: Date.parse('2026-01-05T22:00:00Z') }])
  const raw = await formatOneVault(passphrase, { version: 1, sessions: [session, untouched], legacy: null, contacts: [], legacyArchive: { inventory_halt_logs: logs } })
  values.set(VAULT_STORAGE_KEY, raw)
  await assert.rejects(unlockVault('wrong passphrase entirely', env), /does not match/)
  const vault = await unlockVault(passphrase, env)
  assert.equal(vault.describe().storedVersion, 1)
  const { moments, settings } = vault.snapshot()
  assert.equal(moments.length, 2, 'the answered session and the earlier log become moments; the untouched session does not')
  assert.deepEqual(moments.map(moment => moment.source), ['imported', 'session'])
  assert.equal(moments[1].at, session.startedAt); assert.equal(moments[1].halt.tired, 7); assert.equal(moments[1].sessionId, session.id)
  assert.equal(settings.checkInOnOpen, true)
  assert.equal(values.get(VAULT_STORAGE_KEY), raw, 'unlocking alone never rewrites storage')
  await vault.update(data => data)
  assert.equal(JSON.parse(values.get(VAULT_STORAGE_KEY)!).version, 2)
  assert.equal(vault.describe().storedVersion, 2)
  const reopened = await unlockVault(passphrase, env)
  assert.equal(reopened.snapshot().moments.length, 2)
  const target = environment()
  assert.equal((await unlockVault(passphrase, target.env, raw)).snapshot().sessions.length, 2, 'an older backup can still be restored')
})

test('generated recovery keys tolerate formatting differences but not wrong characters', async () => {
  const key = generateRecoveryKey(crypto)
  assert.match(key, /^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){4}$/)
  assert.notEqual(generateRecoveryKey(crypto), key)
  assert.equal(normalizeRecoveryKey('o1l-i'), '0111'); assert(!isRecoveryKey('too short'))
  const { env } = environment()
  await createVault(key, env, 'generated')
  const typed = key.toLowerCase().replace(/-/g, ' ').replace(/0/g, 'o')
  assert.ok(await unlockVault(typed, env))
  const wrong = (key[0] === 'A' ? 'B' : 'A') + key.slice(1)
  await assert.rejects(unlockVault(wrong, env), /does not match/)
  await assert.rejects(createVault('not a key', environment().env, 'generated'), /format/)
})

test('own passphrases need 12 characters and avoid obvious patterns', async () => {
  assert.match(validatePassphrase('short one')!, /12 characters/)
  assert.match(validatePassphrase('aaaaaaaaaaaaaaa')!, /less predictable/)
  assert.match(validatePassphrase('password12345')!, /less predictable/)
  assert.equal(validatePassphrase('lantern by the river'), null)
  await assert.rejects(createVault('short one', environment().env), /12 characters/)
})

test('device passkeys unlock through their PRF secret, travel in backups, and can be removed', async () => {
  const { env, values } = environment()
  const vault = await createVault(passphrase, env)
  await vault.update(data => ({ ...data, contacts: [{ id: '1', name: 'Sponsor', phone: '555', role: '' }] }))
  const credentialId = 'credential-id-0123456789'
  await vault.addPasskey({ credentialId, rpId: 'fourthstep.app', prfSalt: new Uint8Array(32).fill(9), label: 'Phone' }, prfFor(1))
  const stored = values.get(VAULT_STORAGE_KEY)!
  assert(!stored.includes(b64(prfFor(1))), 'the PRF output is never stored')
  assert.deepEqual(vault.describe().passkeys.map(item => item.label), ['Phone'])
  vault.close()
  const unlocked = await unlockVault({ kind: 'passkey', credentialId, prf: prfFor(1) }, env)
  assert.equal(unlocked.snapshot().contacts[0].name, 'Sponsor')
  await assert.rejects(unlockVault({ kind: 'passkey', credentialId, prf: prfFor(2) }, env), /could not unlock/)
  await assert.rejects(unlockVault({ kind: 'passkey', credentialId: 'unknown-credential-xyz', prf: prfFor(1) }, env), /not set up/)
  const backup = await unlocked.backup()
  assert.equal((await unlockVault({ kind: 'passkey', credentialId, prf: prfFor(1) }, environment().env, backup)).snapshot().contacts.length, 1)
  const moved = JSON.parse(stored); moved.slots.find((slot: { kind: string }) => slot.kind === 'passkey').credentialId = 'another-credential-id-000'
  await assert.rejects(unlockVault({ kind: 'passkey', credentialId: 'another-credential-id-000', prf: prfFor(1) }, environment().env, JSON.stringify(moved)), /could not unlock/)
  await unlocked.removePasskey(credentialId)
  await assert.rejects(unlockVault({ kind: 'passkey', credentialId, prf: prfFor(1) }, env), /not set up/)
  assert.ok(await unlockVault(passphrase, env), 'the recovery passphrase is unaffected')
})

test('a PIN stays in this browser, is excluded from backups, and turns off after five wrong attempts', async () => {
  const { env, values } = environment()
  const vault = await createVault(passphrase, env)
  await assert.rejects(vault.setPin('1234'), /6 to 12/)
  await assert.rejects(vault.setPin('123456'), /harder to guess/)
  await assert.rejects(vault.setPin('111111'), /harder to guess/)
  await vault.setPin('482913')
  assert.deepEqual(vault.describe().pin, { length: 6, attemptsLeft: 5 })
  const backup = await vault.backup()
  assert(!backup.includes(JSON.parse(values.get(PIN_STORAGE_KEY)!).wrapped), 'backups never contain the PIN-wrapped key')
  await assert.rejects(unlockVault({ kind: 'pin', pin: '482913' }, environment().env, backup), /not set up/)
  assert.ok(await unlockVault({ kind: 'pin', pin: '482913' }, env))
  await assert.rejects(unlockVault({ kind: 'pin', pin: '000001' }, env), /4 attempts left/)
  assert.ok(await unlockVault({ kind: 'pin', pin: '482913' }, env), 'a correct PIN resets the count')
  for (let attempt = 1; attempt < 5; attempt++) await assert.rejects(unlockVault({ kind: 'pin', pin: '000001' }, env), /attempt/)
  await assert.rejects(unlockVault({ kind: 'pin', pin: '000001' }, env), /turned off/)
  assert(!values.has(PIN_STORAGE_KEY))
  await assert.rejects(unlockVault({ kind: 'pin', pin: '482913' }, env), /not set up/)
  assert.ok(await unlockVault(passphrase, env))
})

test('replacing a lost recovery key keeps passkeys working and retires the old secret', async () => {
  const { env } = environment()
  const vault = await createVault(passphrase, env)
  await vault.addPasskey({ credentialId: 'credential-id-abcdefghij', rpId: 'localhost', prfSalt: new Uint8Array(32).fill(3), label: 'Laptop' }, prfFor(7))
  await assert.rejects(vault.verify({ kind: 'recovery', secret: 'not the passphrase' }), /does not match/)
  await vault.verify({ kind: 'passkey', credentialId: 'credential-id-abcdefghij', prf: prfFor(7) })
  const key = generateRecoveryKey(crypto)
  await vault.replaceRecovery(key, 'generated')
  assert.equal(vault.describe().recovery, 'generated')
  await assert.rejects(unlockVault(passphrase, env), /does not match/)
  assert.ok(await unlockVault(key, env))
  assert.ok(await unlockVault({ kind: 'passkey', credentialId: 'credential-id-abcdefghij', prf: prfFor(7) }, env))
})

test('key slots and data are authenticated together, compressed, and newer data is refused safely', async () => {
  const { env, values } = environment()
  const vault = await createVault(passphrase, env)
  const raw = values.get(VAULT_STORAGE_KEY)!
  const envelope = JSON.parse(raw)
  assert.equal(envelope.cipher.encoding, 'gzip')
  const relabelled = { ...envelope, slots: envelope.slots.map((slot: object) => ({ ...slot, secret: 'generated' })) }
  await assert.rejects(unlockVault(passphrase, environment().env, JSON.stringify(relabelled)), /does not match|damaged/)
  const extraSlot = { ...envelope, slots: [...envelope.slots, { kind: 'passkey', credentialId: 'injected-credential-0000', rpId: 'evil.example', prfSalt: b64(new Uint8Array(32)), label: 'x', createdAt: 0, iv: b64(new Uint8Array(12)), wrapped: b64(new Uint8Array(48)) }] }
  await assert.rejects(unlockVault(passphrase, environment().env, JSON.stringify(extraSlot)), /damaged/)
  assert.throws(() => vault.update(data => ({ ...data, version: 3 } as never)), 'invalid data is never encrypted')
  assert.equal(values.get(VAULT_STORAGE_KEY), raw)
  const newer = environment()
  newer.values.set(VAULT_STORAGE_KEY, await formatOneVault(passphrase, { version: 3, sessions: [] }))
  await assert.rejects(unlockVault(passphrase, newer.env), /newer or incompatible/)
})
