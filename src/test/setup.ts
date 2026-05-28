import "@testing-library/jest-dom/vitest";
import { webcrypto } from "node:crypto";

// jsdom does not expose localStorage under an opaque origin; provide a simple
// in-memory implementation so the vault and settings stores work in tests.
if (globalThis.localStorage == null) {
  const store = new Map<string, string>();
  const localStorageShim: Storage = {
    getItem: (k) => (store.has(k) ? (store.get(k) as string) : null),
    setItem: (k, v) => {
      store.set(k, String(v));
    },
    removeItem: (k) => {
      store.delete(k);
    },
    clear: () => {
      store.clear();
    },
    key: (i) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: localStorageShim,
    configurable: true,
    writable: true,
  });
}

// jsdom ships getRandomValues but not SubtleCrypto. Back the global crypto with
// Node's webcrypto so the vault encryption round-trips in tests.
try {
  if (!("subtle" in (globalThis.crypto ?? {}))) {
    Object.defineProperty(globalThis, "crypto", {
      value: webcrypto,
      configurable: true,
      writable: true,
    });
  }
} catch {
  // already suitable
}
