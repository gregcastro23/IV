// On-device encryption. The six-digit code is the only key: it derives an
// AES-GCM key via PBKDF2, and the ledger is stored as ciphertext. A wrong code
// derives a different key and AES-GCM's auth tag fails to verify — so there is
// genuinely no recovery, exactly as the lock screen warns.

const PREFIX = "fsl:";
const VAULT_KEY = PREFIX + "vault";
const PBKDF2_ITERATIONS = 310_000;

const enc = new TextEncoder();
const dec = new TextDecoder();

export interface Vault {
  v: 1;
  salt: string; // base64
  iv: string; // base64
  ct: string; // base64 ciphertext
}

export interface UnlockedVault<T> {
  key: CryptoKey;
  salt: Uint8Array<ArrayBuffer>;
  data: T;
}

function toB64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

// UTF-8 bytes guaranteed to be backed by a plain ArrayBuffer (not Shared),
// which is what WebCrypto's BufferSource parameters require under TS 6.
function utf8(s: string): Uint8Array<ArrayBuffer> {
  const v = enc.encode(s);
  const out = new Uint8Array(v.byteLength);
  out.set(v);
  return out;
}

export function hasVault(): boolean {
  try {
    return localStorage.getItem(VAULT_KEY) != null;
  } catch {
    return false;
  }
}

export function clearVault(): void {
  try {
    localStorage.removeItem(VAULT_KEY);
  } catch {
    // ignore
  }
}

function loadVault(): Vault | null {
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    return raw ? (JSON.parse(raw) as Vault) : null;
  } catch {
    return null;
  }
}

export async function deriveKey(pin: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", utf8(pin), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Re-encrypt and persist `data` under an existing key (a fresh IV each write). */
export async function writeVault<T>(
  key: CryptoKey,
  salt: Uint8Array<ArrayBuffer>,
  data: T,
): Promise<void> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ctBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, utf8(JSON.stringify(data)));
  const vault: Vault = {
    v: 1,
    salt: toB64(salt),
    iv: toB64(iv),
    ct: toB64(new Uint8Array(ctBuf)),
  };
  try {
    localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
  } catch {
    // storage unavailable — the session continues in memory
  }
}

/** Create a brand-new vault from a code, seeding it with `data`. */
export async function createVault<T>(
  pin: string,
  data: T,
): Promise<{ key: CryptoKey; salt: Uint8Array<ArrayBuffer> }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(pin, salt);
  await writeVault(key, salt, data);
  return { key, salt };
}

/** Try to open the stored vault with a code. Returns null on the wrong code. */
export async function openVault<T>(pin: string): Promise<UnlockedVault<T> | null> {
  const vault = loadVault();
  if (!vault) return null;
  const salt = fromB64(vault.salt);
  const key = await deriveKey(pin, salt);
  try {
    const ptBuf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromB64(vault.iv) },
      key,
      fromB64(vault.ct),
    );
    const data = JSON.parse(dec.decode(ptBuf)) as T;
    return { key, salt, data };
  } catch {
    return null; // auth tag mismatch — wrong code
  }
}
