import test from 'node:test'
import assert from 'node:assert/strict'
import {
  backfillMoments, countTags, createMoment, emptyMomentInput, findInsights, formatOffset, momentDay, momentMinutes, momentsCsv,
  momentsOnDay, summarizeDayParts, summarizeDays, syncSessionMoment, upsertMoment, checkInSuggestions, type Moment, type MomentInput,
} from '../lib/moments'
import { advanceSession, createInventorySession } from '../lib/inventory-sessions'

/** A check-in at a wall-clock time in a fixed UTC offset, independent of the machine running the test. */
function at(local: string, offset = -300, input: Partial<MomentInput> = {}): Moment {
  const [day, time] = local.split(' ')
  const instant = Date.parse(`${day}T${time}:00Z`) - offset * 60_000
  return createMoment({ ...emptyMomentInput(), ...input }, new Date(instant), { at: instant, offset })
}

test('moments keep the day and time where they happened, across time zones', () => {
  const lateNight = at('2026-10-01 23:30', -240)
  assert.equal(new Date(lateNight.at).toISOString(), '2026-10-02T03:30:00.000Z')
  assert.equal(momentDay(lateNight), '2026-10-01', 'a late check-in belongs to the day it was lived')
  assert.equal(momentMinutes(lateNight), 23 * 60 + 30)
  const abroad = at('2026-10-02 07:05', 330)
  assert.equal(momentDay(abroad), '2026-10-02'); assert.equal(formatOffset(abroad.offset), 'UTC+05:30'); assert.equal(formatOffset(-240), 'UTC-04:00')
  assert.deepEqual(momentsOnDay([abroad, lateNight], '2026-10-01').map(moment => moment.id), [lateNight.id])
})

test('check-ins are cleaned and validated before they are stored', () => {
  const moment = createMoment({ ...emptyMomentInput(), mood: 2, feelings: [' Anxious', 'Anxious', ''], context: ['Work or school'], note: '  meeting ran late  ' })
  assert.deepEqual(moment.feelings, ['Anxious']); assert.equal(moment.note, 'meeting ran late'); assert.equal(moment.source, 'check-in')
  assert.throws(() => createMoment({ ...emptyMomentInput(), mood: 6 as never }))
  assert.throws(() => createMoment({ ...emptyMomentInput(), halt: { hungry: 11, angry: 0, lonely: 0, tired: 0 } }))
  const later = at('2026-10-02 12:00'); const earlier = at('2026-10-02 08:00')
  assert.deepEqual(upsertMoment(upsertMoment([], later), earlier).map(item => item.id), [earlier.id, later.id])
})

test('a full inventory records its HALT step once and updates it when revisited', () => {
  let session = createInventorySession()
  session.halt = { hungry: 1, angry: 7, lonely: 2, tired: 3, note: 'Tense morning' }
  session = advanceSession(session)
  const first = syncSessionMoment([], session, new Date('2026-10-02T13:00:00Z'))
  assert.equal(first.length, 1); assert.equal(first[0].sessionId, session.id); assert.equal(first[0].urge, null)
  const revisited = syncSessionMoment(first, { ...session, halt: { ...session.halt, angry: 4 } }, new Date('2026-10-02T15:00:00Z'))
  assert.equal(revisited.length, 1); assert.equal(revisited[0].id, first[0].id); assert.equal(revisited[0].at, first[0].at); assert.equal(revisited[0].halt.angry, 4)
  const checkIn = { ...at('2026-10-02 08:00', -300, { note: 'From my check-in' }), sessionId: 'linked' }
  const linked = syncSessionMoment([checkIn], { ...session, id: 'linked', halt: { ...session.halt, note: '' } })
  assert.equal(linked[0].note, 'From my check-in', 'a check-in note is not erased by an empty session note')
})

test('history from before moments is imported without inventing data', () => {
  const answered = advanceSession(createInventorySession(new Date('2026-09-01T12:00:00Z')))
  const untouched = createInventorySession(new Date('2026-09-02T12:00:00Z'))
  const logs = JSON.stringify([{ id: 'a', hungry: 12, angry: 4, lonely: 0, tired: 2, timestamp: Date.parse('2026-08-01T09:00:00Z') }])
  const moments = backfillMoments([untouched, answered], logs)
  assert.deepEqual(moments.map(item => item.source), ['imported', 'session'])
  assert.equal(moments[0].halt.hungry, 10, 'out-of-range values are clamped'); assert.equal(moments[0].urge, null); assert.equal(moments[0].note, '')
  assert.deepEqual(backfillMoments([], '{not json'), [])
})

test('daily and time-of-day summaries average only what was recorded', () => {
  const moments = [
    at('2026-10-01 08:00', -300, { mood: 4, halt: { hungry: 2, angry: 2, lonely: 2, tired: 6 }, urge: 1 }),
    at('2026-10-01 19:00', -300, { mood: 2, halt: { hungry: 4, angry: 8, lonely: 6, tired: 4 }, urge: 5 }),
    { ...at('2026-10-02 20:00'), urge: null },
  ]
  const [first, second, empty] = summarizeDays(moments, ['2026-10-01', '2026-10-02', '2026-10-03'])
  assert.equal(first.count, 2); assert.equal(first.mood, 3); assert.equal(first.needs.angry, 5); assert.equal(first.needs.urge, 3)
  assert.equal(second.mood, null); assert.equal(second.needs.urge, null)
  assert.equal(empty.count, 0); assert.equal(empty.needs.tired, null)
  const parts = summarizeDayParts(moments)
  assert.equal(parts.find(part => part.key === 'morning')!.count, 1); assert.equal(parts.find(part => part.key === 'evening')!.count, 2)
  assert.deepEqual(countTags([at('2026-10-01 08:00', -300, { feelings: ['Sad', 'Calm'] }), at('2026-10-01 09:00', -300, { feelings: ['Sad'] })], 'feelings'), [{ value: 'Sad', count: 2 }, { value: 'Calm', count: 1 }])
})

test('insights need enough check-ins and a real difference, and describe tendencies', () => {
  assert.deepEqual(findInsights([at('2026-10-01 08:00'), at('2026-10-01 09:00')], '2026-10-01'), [])
  const calm = Array.from({ length: 6 }, (_, index) => at(`2026-09-2${index + 1} 09:00`, -300, { mood: 4, halt: { hungry: 1, angry: 1, lonely: 1, tired: 2 }, urge: 1, context: ['Home'] }))
  const hard = Array.from({ length: 4 }, (_, index) => at(`2026-09-2${index + 1} 20:30`, -300, { mood: 2, halt: { hungry: 2, angry: 8, lonely: 7, tired: 5 }, urge: 6, feelings: ['Resentful'], context: ['Work or school'] }))
  const insights = findInsights([...calm, ...hard], '2026-09-27')
  const text = insights.map(item => item.text).join('\n')
  assert.match(text, /Anger has tended to run highest in the evening/)
  assert.match(text, /When (anger|loneliness) was 6 or higher, urges averaged 6/)
  assert.match(text, /At work or school, \w+ averaged/)
  assert.match(text, /“Resentful” is the feeling you have named most often \(4 times\)/)
  assert(insights.length <= 6)
  assert.doesNotMatch(text, /because|causes/i)
  const steady = Array.from({ length: 8 }, (_, index) => at(`2026-09-2${index % 6 + 1} ${String(8 + index).padStart(2, '0')}:00`, -300, { mood: 3, halt: { hungry: 3, angry: 3, lonely: 3, tired: 3 }, urge: 2 }))
  assert(!findInsights(steady, '2026-09-27').some(item => item.id.startsWith('time-') || item.id.startsWith('urge-')))
})

test('CSV export opens cleanly in spreadsheets and cannot run formulas', () => {
  const csv = momentsCsv([
    at('2026-10-02 09:15', -240, { mood: 3, note: '=HYPERLINK("http://example.invalid","click")', feelings: ['Calm'] }),
    at('2026-10-01 18:00', -240, { note: 'Said "no" kindly\nthen rested', context: ['@home', '-alone'] }),
  ])
  assert(csv.startsWith('﻿"Date","Time","UTC offset"'))
  const lines = csv.trim().split('\r\n')
  assert.equal(lines.length, 3)
  assert(lines[1].startsWith('"2026-10-01"'), 'rows are chronological')
  assert.match(csv, /"'=HYPERLINK\(""http:\/\/example.invalid"",""click""\)"/)
  assert.match(csv, /"Said ""no"" kindly\nthen rested"/)
  assert.match(csv, /"'@home; -alone"/)
  assert.match(csv, /"UTC-04:00"/)
})

test('suggestions after a check-in put urgent support first and match what was noticed', () => {
  const crisis = checkInSuggestions({ ...emptyMomentInput(), urge: 8, halt: { hungry: 0, angry: 7, lonely: 0, tired: 0 }, feelings: ['Ashamed'] })
  assert.equal(crisis[0].id, 'reach-out'); assert(crisis[0].urgent)
  assert.deepEqual(crisis.map(item => item.action), ['support', 'resentments', 'harms'])
  assert.equal(checkInSuggestions({ ...emptyMomentInput(), mood: 1 })[0].id, 'reach-out')
  assert.deepEqual(checkInSuggestions({ ...emptyMomentInput(), mood: 4 }).map(item => item.id), ['strength'])
  assert.deepEqual(checkInSuggestions({ ...emptyMomentInput(), mood: 3 }).map(item => item.id), ['steady'])
  assert(checkInSuggestions({ ...emptyMomentInput(), mood: 2, urge: 5, halt: { hungry: 9, angry: 9, lonely: 9, tired: 9 }, feelings: ['Afraid'] }).length <= 4)
})
