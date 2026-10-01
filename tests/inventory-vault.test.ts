import test from 'node:test'
import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'
import { createVault, unlockVault, VAULT_STORAGE_KEY, type VaultEnvironment } from '../lib/inventory-vault'
import { createInventorySession, SESSION_STORAGE_KEY, upsertSession, createEntryDraft, updateDraftValue, saveDraftEntry, advanceSession, finishInventorySession } from '../lib/inventory-sessions'

const passphrase = 'test-only random words in a unit fixture'
function environment() {
  const values = new Map<string, string>()
  let fail = false
  const env: VaultEnvironment = {
    crypto: webcrypto as unknown as Crypto,
    storage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => { if (fail) throw new Error('Quota'); values.set(key, value) }, removeItem: key => { values.delete(key) } },
  }
  return { env, values, failWrites: (value: boolean) => { fail = value } }
}
test('only authenticated ciphertext is saved; wrong passwords and tampered headers cannot unlock', async () => {
  const { env, values } = environment()
  const vault = await createVault(passphrase, env)
  const session = createInventorySession(); session.halt.note = 'PRIVATE SENTINEL'; session.title = 'SECRET TITLE'
  await vault.update(data => ({ ...data, sessions: [session], contacts: [{ id: '1', name: 'SECRET NAME', phone: 'SECRET PHONE', role: 'Sponsor' }] }))
  const raw = values.get(VAULT_STORAGE_KEY)!
  for (const value of ['PRIVATE SENTINEL', 'SECRET TITLE', 'SECRET NAME', 'SECRET PHONE', passphrase]) assert(!raw.includes(value))
  vault.close()
  assert.throws(() => vault.snapshot(), /locked/)
  await assert.rejects(vault.backup(), /locked/)
  await assert.rejects(unlockVault('wrong passphrase', env), /does not match/)
  assert.equal((await unlockVault(passphrase, env)).snapshot().sessions[0].halt.note, session.halt.note)
  const tampered = JSON.parse(raw); tampered.id = webcrypto.randomUUID()
  await assert.rejects(unlockVault(passphrase, env, JSON.stringify(tampered)), /damaged/)
  const body = JSON.parse(raw); body.ciphertext = (body.ciphertext[0] === 'A' ? 'B' : 'A') + body.ciphertext.slice(1)
  await assert.rejects(unlockVault(passphrase, env, JSON.stringify(body)), /damaged/)
  assert.equal(values.get(VAULT_STORAGE_KEY), raw)
})
test('each save has a new nonce; queued edits preserve sessions and contacts together', async () => {
  const { env, values } = environment(); const vault = await createVault(passphrase, env)
  const first = values.get(VAULT_STORAGE_KEY)!
  const one = createInventorySession(); const two = createInventorySession()
  await Promise.all([
    vault.update(data => ({ ...data, sessions: upsertSession(data.sessions, one) })),
    vault.update(data => ({ ...data, sessions: upsertSession(data.sessions, two) })),
    vault.update(data => ({ ...data, contacts: [{ id: '1', name: 'Friend', role: '', phone: '123' }] })),
  ])
  const last = values.get(VAULT_STORAGE_KEY)!
  assert.notEqual(JSON.parse(first).cipher.iv, JSON.parse(last).cipher.iv)
  const restored = await unlockVault(passphrase, env)
  assert.equal(restored.snapshot().sessions.length, 2); assert.equal(restored.snapshot().contacts.length, 1)
})
test('failed saves preserve the previous ciphertext and allow encrypted recovery of unsaved work', async () => {
  const { env, values, failWrites } = environment(); const vault = await createVault(passphrase, env)
  const before = values.get(VAULT_STORAGE_KEY)!
  failWrites(true)
  const session = createInventorySession(); session.reflection = 'Unsaved reflection'
  await assert.rejects(vault.update(data => ({ ...data, sessions: [session] })), /storage/)
  assert.equal(values.get(VAULT_STORAGE_KEY), before)
  const backup = await vault.backup(); const target = environment()
  const recovered = await unlockVault(passphrase, target.env, backup)
  assert.equal(recovered.snapshot().sessions[0].reflection, session.reflection)
  failWrites(false); await vault.update(data => data)
  assert.equal((await unlockVault(passphrase, env)).snapshot().sessions[0].reflection, session.reflection)
})
test('migration preserves drafts, contacts, and the full earlier archive before cleanup', async () => {
  const { env, values } = environment()
  const session = createInventorySession(); session.halt.note = 'Earlier note'
  values.set(SESSION_STORAGE_KEY, JSON.stringify([session]))
  values.set('inventory_contacts', JSON.stringify([{ id: 'friend', name: 'Friend', phone: '123', role: 'Sponsor' }]))
  values.set('inventory_daily_tasks', JSON.stringify([{ unusualOlderField: 'preserve me' }]))
  values.set('inventory_pin_hash', '123456'); values.set('unrelated', 'keep')
  const vault = await createVault(passphrase, env)
  assert.equal(values.get(SESSION_STORAGE_KEY), JSON.stringify([session]), 'cleanup is separate from verified creation')
  assert.deepEqual(vault.cleanup(), [])
  assert(!values.has(SESSION_STORAGE_KEY)); assert(!values.has('inventory_contacts')); assert(!values.has('inventory_pin_hash')); assert.equal(values.get('unrelated'), 'keep')
  const data = (await unlockVault(passphrase, env)).snapshot()
  assert.equal(data.sessions[0].halt.note, session.halt.note); assert.equal(data.contacts[0].name, 'Friend')
  assert(data.legacyArchive.inventory_daily_tasks.includes('preserve me'))
})
test('failed migration, malformed old sessions, and unsupported vault versions never erase originals', async () => {
  const { env, values, failWrites } = environment()
  values.set(SESSION_STORAGE_KEY, '[broken')
  await assert.rejects(createVault(passphrase, env), /Migration stopped/)
  assert.equal(values.get(SESSION_STORAGE_KEY), '[broken'); assert(!values.has(VAULT_STORAGE_KEY))
  const original = JSON.stringify([createInventorySession()]); values.set(SESSION_STORAGE_KEY, original); failWrites(true)
  await assert.rejects(createVault(passphrase, env)); assert.equal(values.get(SESSION_STORAGE_KEY), original)
  failWrites(false); const vault = await createVault(passphrase, env)
  const changed = JSON.stringify([createInventorySession()]); values.set(SESSION_STORAGE_KEY, changed)
  assert.deepEqual(vault.cleanup(), [SESSION_STORAGE_KEY]); assert.equal(values.get(SESSION_STORAGE_KEY), changed)
  const future = JSON.parse(values.get(VAULT_STORAGE_KEY)!); future.version = 999
  values.set(VAULT_STORAGE_KEY, JSON.stringify(future))
  await assert.rejects(unlockVault(passphrase, env), /unsupported/); assert.equal(JSON.parse(values.get(VAULT_STORAGE_KEY)!).version, 999)
})
test('another tab cannot be overwritten; backup retains the conflicting edits', async () => {
  const { env, values } = environment(); const first = await createVault(passphrase, env); const second = await unlockVault(passphrase, env)
  const a = createInventorySession(); a.title = 'First tab'; await first.update(data => ({ ...data, sessions: [a] }))
  const stored = values.get(VAULT_STORAGE_KEY)
  const b = createInventorySession(); b.title = 'Second tab'
  await assert.rejects(second.update(data => ({ ...data, sessions: [b] })), /another tab/)
  assert.equal(values.get(VAULT_STORAGE_KEY), stored)
  const target = environment(); const recovered = await unlockVault(passphrase, target.env, await second.backup())
  assert.equal(recovered.snapshot().sessions[0].title, 'Second tab')
  await assert.rejects(unlockVault(passphrase, env, await second.backup()), /already contains/)
})
test('clearing the encrypted copy prevents cleanup of readable originals', async () => {
  const { env, values } = environment(); const original = JSON.stringify([createInventorySession()]); values.set(SESSION_STORAGE_KEY, original)
  const vault = await createVault(passphrase, env); values.delete(VAULT_STORAGE_KEY)
  assert.deepEqual(vault.cleanup(), [SESSION_STORAGE_KEY]); assert.equal(values.get(SESSION_STORAGE_KEY), original)
})

test('a guided answer survives encrypted reload and completes into a reviewable daily session', async () => {
  const { env } = environment(); let vault = await createVault(passphrase, env)
  let session = advanceSession(createInventorySession())
  session.draft = updateDraftValue(createEntryDraft('resentments'), 'Fixture colleague')
  session.draft = { ...session.draft, question: 1 }
  session.draft = updateDraftValue(session.draft, 'A synthetic unfinished answer')
  await vault.update(data => ({ ...data, sessions: [session] })); vault.close()
  vault = await unlockVault(passphrase, env); session = vault.snapshot().sessions[0]
  assert.equal(session.draft?.question, 1)
  assert.equal(session.draft?.section === 'resentments' && session.draft.entry.cause, 'A synthetic unfinished answer')
  session = saveDraftEntry(session)
  while (session.currentStep !== 'review') session = advanceSession(session)
  session = finishInventorySession(session)
  await vault.update(data => ({ ...data, sessions: [session] })); vault.close()
  vault = await unlockVault(passphrase, env)
  assert.equal(vault.snapshot().sessions[0].resentments[0].object, 'Fixture colleague')
  assert(vault.snapshot().sessions[0].completedAt)
  const next = createInventorySession()
  await vault.update(data => ({ ...data, sessions: upsertSession(data.sessions, next) }))
  assert.equal(vault.snapshot().sessions.length, 2)
  assert.equal(next.resentments.length, 0)
})
