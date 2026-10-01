import test, { beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  SESSION_STORAGE_KEY, SESSION_STEPS, advanceSession, createEntryDraft,
  createInventorySession, finishInventorySession, localDate, readInventorySessions,
  reviewText, saveDraftEntry, saveInventorySession, sessionSearchText, updateDraftValue,
  type InventorySession,
} from '../lib/inventory-sessions'

let records: Map<string, string>
beforeEach(() => {
  records = new Map()
  Object.assign(globalThis, {
    window: {}, localStorage: {
      getItem: (key: string) => records.get(key) ?? null,
      setItem: (key: string, value: string) => records.set(key, value),
    },
  })
})

function sessionWithResentment(): InventorySession {
  let session = createInventorySession()
  let draft = createEntryDraft('resentments')
  draft = updateDraftValue(draft, '  A synthetic colleague  ')
  draft = updateDraftValue({ ...draft, question: 1 }, '  A broken promise  ')
  draft = updateDraftValue({ ...draft, question: 2 }, ['Security'])
  draft = updateDraftValue({ ...draft, question: 3 }, ['Anger'])
  session = saveDraftEntry({ ...session, draft })
  return session
}

test('daily sessions use the local calendar, not the UTC date', () => {
  const previousTimezone = process.env.TZ
  process.env.TZ = 'America/New_York'
  try { assert.equal(localDate(new Date('2026-09-30T21:30:00-04:00')), '2026-09-30') }
  finally { if (previousTimezone === undefined) delete process.env.TZ; else process.env.TZ = previousTimezone }
})

test('answers and the current question survive pause and reload', () => {
  const session = createInventorySession()
  const draft = updateDraftValue({ ...createEntryDraft('fears'), question: 1 }, 'Uncertainty about tomorrow')
  saveInventorySession({ ...session, currentStep: 'fears', draft })
  assert.deepEqual(readInventorySessions()[0].draft, draft)
  assert.equal(readInventorySessions()[0].currentStep, 'fears')
})

test('a failed write is reported and does not replace the saved session', () => {
  const session = sessionWithResentment()
  saveInventorySession(session)
  const before = records.get(SESSION_STORAGE_KEY)
  globalThis.localStorage.setItem = () => { throw new Error('QuotaExceededError') }
  assert.throws(() => saveInventorySession({ ...session, reflection: 'Unsaved draft' }), /could not be saved/)
  assert.equal(records.get(SESSION_STORAGE_KEY), before)
})

test('corrupt saved data is preserved and blocks an overwrite', () => {
  records.set(SESSION_STORAGE_KEY, '{broken JSON')
  assert.throws(() => readInventorySessions(), /original data has been preserved/)
  assert.throws(() => saveInventorySession(createInventorySession()), /original data has been preserved/)
  assert.equal(records.get(SESSION_STORAGE_KEY), '{broken JSON')
})

test('valid JSON with an invalid session shape is reported', () => {
  records.set(SESSION_STORAGE_KEY, '[{"version":1,"id":"broken"}]')
  assert.throws(() => readInventorySessions(), /could not be read/)
})

test('a future format is preserved rather than silently downgraded', () => {
  records.set(SESSION_STORAGE_KEY, JSON.stringify([{ ...createInventorySession(), version: 2 }]))
  assert.throws(() => saveInventorySession(createInventorySession()), /original data has been preserved/)
  assert.match(records.get(SESSION_STORAGE_KEY)!, /"version":2/)
})

test('history stays intact and old ledger storage is untouched', () => {
  records.set('inventory_resentments', '[{"id":"legacy-record"}]')
  for (let index = 0; index < 125; index++) {
    saveInventorySession({ ...createInventorySession(), id: `session-${index}`, updatedAt: index })
  }
  assert.equal(readInventorySessions().length, 125)
  assert.equal(records.get('inventory_resentments'), '[{"id":"legacy-record"}]')
  assert.equal(readInventorySessions()[0].id, 'session-124')
})

test('a new daily session starts clean while previous entries remain', () => {
  const previous = sessionWithResentment()
  saveInventorySession(previous)
  const next = createInventorySession()
  saveInventorySession(next)
  assert.equal(next.resentments.length, 0)
  assert.equal(next.draft, null)
  assert.equal(readInventorySessions().find(item => item.id === previous.id)!.resentments.length, 1)
})

test('editing an entry updates it without adding a duplicate', () => {
  const session = sessionWithResentment()
  const draft = updateDraftValue(createEntryDraft('resentments', session.resentments[0]), 'Updated colleague')
  const saved = saveDraftEntry({ ...session, draft })
  assert.equal(saved.resentments.length, 1)
  assert.equal(saved.resentments[0].id, session.resentments[0].id)
  assert.equal(saved.resentments[0].object, 'Updated colleague')
  assert.equal(saved.resentments[0].cause, 'A broken promise')
})

test('partial entries cannot be saved or silently skipped', () => {
  const session = { ...createInventorySession(), currentStep: 'resentments' as const, draft: createEntryDraft('resentments') }
  assert.throws(() => saveDraftEntry(session), /required answers/)
  assert.throws(() => advanceSession(session), /unfinished entry/)
})

test('empty sections are allowed after explicitly reviewing each one', () => {
  let session = createInventorySession()
  for (let index = 0; index < SESSION_STEPS.length - 1; index++) session = advanceSession(session)
  const complete = finishInventorySession(session)
  assert.equal(complete.currentStep, 'review')
  assert.ok(complete.completedAt)
  assert.deepEqual(complete.reviewed, [...SESSION_STEPS])
})

test('completion requires every section and no unfinished entry', () => {
  assert.throws(() => finishInventorySession(createInventorySession()), /Visit each section/)
  const reviewed = { ...createInventorySession(), reviewed: [...SESSION_STEPS] }
  assert.throws(() => finishInventorySession({ ...reviewed, draft: createEntryDraft('assets') }), /unfinished entry/)
  assert.equal(finishInventorySession({ ...reviewed, completedAt: 123 }).completedAt, 123)
})

test('review export contains every category and the closing reflection', () => {
  const session = {
    ...sessionWithResentment(),
    fears: [{ id: 'fear', fear: 'Uncertainty', cause: 'A change at work', affectedInstincts: ['Security'], createdAt: 1 }],
    harms: [{ id: 'harm', person: 'A friend', harm: 'Interrupted them', amends: 'Listen carefully', willingness: 'willing' as const, createdAt: 1 }],
    assets: [{ id: 'asset', virtue: 'Honesty', behavior: 'Asked for help', timestamp: 1 }],
    reflection: 'I noticed a pattern', nextStep: 'Make time to listen',
  }
  const text = reviewText(session, 'My inventory', 'September 30, 2026')
  for (const value of ['A synthetic colleague', 'Uncertainty', 'Interrupted them', 'Asked for help', 'I noticed a pattern', 'Make time to listen']) {
    assert.ok(text.includes(value), value)
  }
  assert.ok(sessionSearchText(session).includes('a change at work'))
})
