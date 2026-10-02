import { fromBase64Url, toBase64Url, type PasskeyInfo } from './inventory-vault'

// Device unlock uses a passkey held by the phone or computer (Face ID, Touch ID, Android fingerprint or face
// unlock, Windows Hello, or the device screen lock). The WebAuthn PRF extension asks the authenticator for a
// secret that only exists after the person verifies themselves; the vault uses it to unwrap the data key.
// No server is involved: the challenge is random because nothing is being signed in, only a key is derived.

type Capabilities = Partial<Record<'extension:prf' | 'userVerifyingPlatformAuthenticator', boolean>>
type CredentialStatics = typeof PublicKeyCredential & {
  getClientCapabilities?: () => Promise<Capabilities>
  signalUnknownCredential?: (options: { rpId: string; credentialId: string }) => Promise<void>
}
export type DeviceSupport = { available: boolean; reason?: string }

function statics(): CredentialStatics | undefined {
  return typeof window !== 'undefined' && 'PublicKeyCredential' in window ? window.PublicKeyCredential as CredentialStatics : undefined
}
const random = (length: number) => crypto.getRandomValues(new Uint8Array(length))

export async function deviceUnlockSupport(): Promise<DeviceSupport> {
  const api = statics()
  if (!api || !window.isSecureContext || location.protocol === 'file:') return { available: false, reason: 'Device unlock needs the website version of Fourth Step in a current browser.' }
  const capabilities = await api.getClientCapabilities?.().catch(() => undefined)
  if (capabilities?.['extension:prf'] === false) return { available: false, reason: 'This browser cannot use passkeys for encryption yet. Try Safari, Chrome, or Edge, or use a PIN.' }
  const platform = capabilities?.userVerifyingPlatformAuthenticator ?? await api.isUserVerifyingPlatformAuthenticatorAvailable().catch(() => false)
  return platform ? { available: true } : { available: false, reason: 'This device has no fingerprint, face, or screen-lock authenticator available to the browser.' }
}

/** A friendly name for what the person will see when unlocking. */
export function deviceUnlockName(): string {
  const agent = typeof navigator === 'undefined' ? '' : navigator.userAgent
  if (/iPhone|iPad|Macintosh/.test(agent)) return 'Face ID or Touch ID'
  if (/Android/.test(agent)) return 'fingerprint or face'
  if (/Windows/.test(agent)) return 'Windows Hello'
  return 'fingerprint, face, or screen lock'
}
export function deviceLabel(): string {
  const agent = typeof navigator === 'undefined' ? '' : navigator.userAgent
  const device = /iPhone/.test(agent) ? 'iPhone' : /iPad/.test(agent) ? 'iPad' : /Android/.test(agent) ? 'Android device' : /Macintosh/.test(agent) ? 'Mac' : /Windows/.test(agent) ? 'Windows computer' : /CrOS/.test(agent) ? 'Chromebook' : 'This device'
  return `${device} · added ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
}

function friendly(cause: unknown, action: 'set up' | 'unlock'): Error {
  const name = cause instanceof DOMException ? cause.name : ''
  if (name === 'NotAllowedError' || name === 'AbortError') return new Error(action === 'unlock' ? 'Device unlock was cancelled or timed out. Try again, or use another way to unlock.' : 'Setup was cancelled or timed out. Nothing was changed.')
  if (name === 'InvalidStateError') return new Error('This device is already set up to unlock your vault.')
  if (name === 'SecurityError') return new Error('Device unlock is not available on this web address.')
  return cause instanceof Error && !name ? cause : new Error(`Device unlock could not be ${action === 'unlock' ? 'used' : 'set up'} here. Use another way to unlock.`)
}
function prfOutput(credential: PublicKeyCredential): Uint8Array | null {
  const first = credential.getClientExtensionResults().prf?.results?.first
  return first ? new Uint8Array(first instanceof ArrayBuffer ? first : first.buffer.slice(first.byteOffset, first.byteOffset + first.byteLength) as ArrayBuffer) : null
}

/** Asks the device to verify the person and return the PRF secret for one of the vault's passkeys. */
export async function evaluateDevicePasskey(passkeys: Pick<PasskeyInfo, 'credentialId' | 'prfSalt'>[]): Promise<{ credentialId: string; prf: Uint8Array }> {
  if (!passkeys.length) throw new Error('No device passkey is set up for this web address.')
  let credential: PublicKeyCredential | null
  try {
    credential = await navigator.credentials.get({ publicKey: {
      challenge: random(32), rpId: location.hostname, userVerification: 'required', timeout: 120_000,
      allowCredentials: passkeys.map(passkey => ({ type: 'public-key', id: fromBase64Url(passkey.credentialId) })),
      extensions: { prf: { evalByCredential: Object.fromEntries(passkeys.map(passkey => [passkey.credentialId, { first: passkey.prfSalt }])) } },
    } }) as PublicKeyCredential | null
  } catch (cause) { throw friendly(cause, 'unlock') }
  const prf = credential && prfOutput(credential)
  if (!credential || !prf) throw new Error('This device verified you but did not return an encryption key. Use your PIN or recovery key.')
  return { credentialId: toBase64Url(new Uint8Array(credential.rawId)), prf }
}

/** Creates a passkey for this vault and returns its PRF secret. Some platforms need a second verification. */
export async function createDevicePasskey(existing: string[]): Promise<{ credentialId: string; rpId: string; prfSalt: Uint8Array; label: string; prf: Uint8Array }> {
  const prfSalt = random(32)
  const rpId = location.hostname
  let credential: PublicKeyCredential | null
  try {
    credential = await navigator.credentials.create({ publicKey: {
      rp: { id: rpId, name: 'Fourth Step' },
      // A discreet, random account entry: nothing here identifies the person or their inventory.
      user: { id: random(16), name: 'Private vault', displayName: 'Private vault' },
      challenge: random(32), timeout: 120_000, attestation: 'none',
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', residentKey: 'preferred', userVerification: 'required' },
      excludeCredentials: existing.map(id => ({ type: 'public-key', id: fromBase64Url(id) })),
      extensions: { prf: { eval: { first: prfSalt } } },
    } }) as PublicKeyCredential | null
  } catch (cause) { throw friendly(cause, 'set up') }
  if (!credential) throw new Error('Setup was cancelled. Nothing was changed.')
  const credentialId = toBase64Url(new Uint8Array(credential.rawId))
  if (!credential.getClientExtensionResults().prf?.enabled) {
    forgetDevicePasskey(rpId, credentialId)
    throw new Error('This device created a passkey but cannot use it for encryption. A PIN or your recovery key will still work.')
  }
  const prf = prfOutput(credential) ?? (await evaluateDevicePasskey([{ credentialId, prfSalt }])).prf
  return { credentialId, rpId, prfSalt, label: deviceLabel(), prf }
}

/** Tells the device's password manager that a passkey is no longer used, where the browser supports it. */
export function forgetDevicePasskey(rpId: string, credentialId: string): void {
  void statics()?.signalUnknownCredential?.({ rpId, credentialId }).catch(() => {})
}
