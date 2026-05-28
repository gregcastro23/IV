// Local storage keys
const STORAGE_KEYS = {
  RESENTMENTS: 'inventory_resentments',
  FEARS: 'inventory_fears',
  HARMS: 'inventory_harms',
  HALT_LOGS: 'inventory_halt_logs',
  DAILY_TASKS: 'inventory_daily_tasks',
  CONTACTS: 'inventory_contacts',
  PIN_HASH: 'inventory_pin_hash',
} as const

export type Resentment = {
  id: string
  object: string
  cause: string
  instincts: string[]
  myPart: string[]
  createdAt: number
  updatedAt: number
}

export type Fear = {
  id: string
  fear: string
  cause: string
  affectedInstincts: string[]
  createdAt: number
}

export type Harm = {
  id: string
  person: string
  harm: string
  amends: string
  willingness: 'ready' | 'willing' | 'not_yet'
  createdAt: number
}

export type HaltLog = {
  id: string
  hungry: number
  angry: number
  lonely: number
  tired: number
  note: string
  timestamp: number
}

export type DailyTask = {
  id: string
  task: string
  completed: boolean
  date: string
}

export type Contact = {
  id: string
  name: string
  phone: string
  role: string
}

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// Generic storage functions
function getFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch {
    return defaultValue
  }
}

function setToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    console.error('Failed to save to localStorage')
  }
}

// Resentments
export function getResentments(): Resentment[] {
  return getFromStorage<Resentment[]>(STORAGE_KEYS.RESENTMENTS, [])
}

export function saveResentment(resentment: Resentment): void {
  const resentments = getResentments()
  const index = resentments.findIndex(r => r.id === resentment.id)
  if (index >= 0) {
    resentments[index] = { ...resentment, updatedAt: Date.now() }
  } else {
    resentments.push(resentment)
  }
  setToStorage(STORAGE_KEYS.RESENTMENTS, resentments)
}

export function deleteResentment(id: string): void {
  const resentments = getResentments().filter(r => r.id !== id)
  setToStorage(STORAGE_KEYS.RESENTMENTS, resentments)
}

// Fears
export function getFears(): Fear[] {
  return getFromStorage<Fear[]>(STORAGE_KEYS.FEARS, [])
}

export function saveFear(fear: Fear): void {
  const fears = getFears()
  const index = fears.findIndex(f => f.id === fear.id)
  if (index >= 0) {
    fears[index] = fear
  } else {
    fears.push(fear)
  }
  setToStorage(STORAGE_KEYS.FEARS, fears)
}

export function deleteFear(id: string): void {
  const fears = getFears().filter(f => f.id !== id)
  setToStorage(STORAGE_KEYS.FEARS, fears)
}

// Harms
export function getHarms(): Harm[] {
  return getFromStorage<Harm[]>(STORAGE_KEYS.HARMS, [])
}

export function saveHarm(harm: Harm): void {
  const harms = getHarms()
  const index = harms.findIndex(h => h.id === harm.id)
  if (index >= 0) {
    harms[index] = harm
  } else {
    harms.push(harm)
  }
  setToStorage(STORAGE_KEYS.HARMS, harms)
}

export function deleteHarm(id: string): void {
  const harms = getHarms().filter(h => h.id !== id)
  setToStorage(STORAGE_KEYS.HARMS, harms)
}

// HALT Logs
export function getHaltLogs(): HaltLog[] {
  return getFromStorage<HaltLog[]>(STORAGE_KEYS.HALT_LOGS, [])
}

export function saveHaltLog(log: HaltLog): void {
  const logs = getHaltLogs()
  logs.unshift(log)
  // Keep only last 30 logs
  setToStorage(STORAGE_KEYS.HALT_LOGS, logs.slice(0, 30))
}

// Daily Tasks
export function getDailyTasks(date: string): DailyTask[] {
  const allTasks = getFromStorage<DailyTask[]>(STORAGE_KEYS.DAILY_TASKS, [])
  return allTasks.filter(t => t.date === date)
}

export function saveDailyTask(task: DailyTask): void {
  const tasks = getFromStorage<DailyTask[]>(STORAGE_KEYS.DAILY_TASKS, [])
  const index = tasks.findIndex(t => t.id === task.id)
  if (index >= 0) {
    tasks[index] = task
  } else {
    tasks.push(task)
  }
  setToStorage(STORAGE_KEYS.DAILY_TASKS, tasks)
}

// Contacts
export function getContacts(): Contact[] {
  return getFromStorage<Contact[]>(STORAGE_KEYS.CONTACTS, [])
}

export function saveContact(contact: Contact): void {
  const contacts = getContacts()
  const index = contacts.findIndex(c => c.id === contact.id)
  if (index >= 0) {
    contacts[index] = contact
  } else {
    contacts.push(contact)
  }
  setToStorage(STORAGE_KEYS.CONTACTS, contacts)
}

export function deleteContact(id: string): void {
  const contacts = getContacts().filter(c => c.id !== id)
  setToStorage(STORAGE_KEYS.CONTACTS, contacts)
}

// PIN Management (simple hash for demo - in production use proper encryption)
export function hashPin(pin: string): string {
  let hash = 0
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash.toString(36)
}

export function getPinHash(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(STORAGE_KEYS.PIN_HASH)
}

export function setPinHash(pin: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEYS.PIN_HASH, hashPin(pin))
}

export function verifyPin(pin: string): boolean {
  const storedHash = getPinHash()
  if (!storedHash) return true // No pin set yet
  return hashPin(pin) === storedHash
}

export function isPinSet(): boolean {
  return getPinHash() !== null
}

// Stats
export function getInventoryStats() {
  return {
    resentments: getResentments().length,
    fears: getFears().length,
    harms: getHarms().length,
    haltLogs: getHaltLogs().length,
  }
}
