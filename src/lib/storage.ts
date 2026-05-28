// Everything stays on this device. These helpers are the only place that
// touches localStorage, namespaced so the ledger never collides with anything
// else on the origin.

const PREFIX = "fsl:";

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    // Corrupt entry or storage unavailable (private mode) — fall back to seed.
    return fallback;
  }
}

export function saveJSON<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage full or blocked. Fail quiet: the session still works in memory.
  }
}
