import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Dispatch, PropsWithChildren, SetStateAction } from "react";
import type {
  ActivityEntry,
  Asset,
  Contact,
  DefectKey,
  Fear,
  Halt,
  HaltTask,
  LedgerData,
  Resentment,
  SexConduct,
  Virtue,
} from "../types.ts";
import { makeId } from "../data/constants.ts";
import { computeAssetTallies, computeDefectTallies, computeFearCount } from "./tallies.ts";
import {
  INITIAL_ACTIVITY,
  SEED_ASSETS,
  SEED_CONTACTS,
  SEED_FEARS,
  SEED_HALT,
  SEED_HALT_TASKS,
  SEED_RESENTMENTS,
  SEED_SEX,
} from "../data/seed.ts";
import { createVault, hasVault as hasStoredVault, openVault, writeVault } from "../lib/crypto.ts";
import { anyOverlayOpen } from "../lib/overlays.ts";

type DraftResentment = Omit<Resentment, "sealed" | "sealedAt">;

interface LedgerContextValue {
  resentments: Resentment[];
  fears: Fear[];
  sexConduct: SexConduct[];
  assets: Asset[];
  haltTasks: HaltTask[];
  halt: Halt;
  privacyMode: boolean;
  locked: boolean;
  hasVault: boolean;
  activityLog: ActivityEntry[];

  setPrivacyMode: Dispatch<SetStateAction<boolean>>;
  setHalt: Dispatch<SetStateAction<Halt>>;
  setHaltTasks: Dispatch<SetStateAction<HaltTask[]>>;
  toggleTask: (id: string) => void;
  resetHalt: () => void;

  sealResentment: (r: DraftResentment) => void;
  sealFear: (f: Omit<Fear, "sealed">) => void;
  sealSex: (s: Omit<SexConduct, "sealed">) => void;
  addAsset: (virtue: Virtue, note: string) => void;

  contacts: Contact[];
  addContact: (c: Omit<Contact, "id">) => void;
  updateContact: (id: string, patch: Partial<Omit<Contact, "id">>) => void;
  removeContact: (id: string) => void;

  defectTallies: Record<DefectKey, number>;
  fearCount: number;
  assetTallies: Record<Virtue, number>;

  /** Create the encrypted vault from a brand-new code (first run). */
  setupPin: (pin: string) => Promise<void>;
  /** Decrypt with a code. Resolves false on the wrong code. */
  unlock: (pin: string) => Promise<boolean>;
  /** Flush, then clear the key and decrypted data from memory. */
  lock: () => void;
}

const LedgerContext = createContext<LedgerContextValue | null>(null);

const SEED_LEDGER: LedgerData = {
  resentments: SEED_RESENTMENTS,
  fears: SEED_FEARS,
  sexConduct: SEED_SEX,
  assets: SEED_ASSETS,
  haltTasks: SEED_HALT_TASKS,
  halt: SEED_HALT,
  contacts: SEED_CONTACTS,
};

const EMPTY_LEDGER: LedgerData = {
  resentments: [],
  fears: [],
  sexConduct: [],
  assets: [],
  haltTasks: [],
  halt: { H: 0, A: 0, L: 0, T: 0 },
  contacts: [],
};

export function LedgerProvider({ children }: PropsWithChildren) {
  // Decrypted ledger lives only in memory, and only while unlocked.
  const [resentments, setResentments] = useState<Resentment[]>([]);
  const [fears, setFears] = useState<Fear[]>([]);
  const [sexConduct, setSexConduct] = useState<SexConduct[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [haltTasks, setHaltTasks] = useState<HaltTask[]>([]);
  const [halt, setHalt] = useState<Halt>(EMPTY_LEDGER.halt);
  const [contacts, setContacts] = useState<Contact[]>([]);

  const [privacyMode, setPrivacyMode] = useState(false);
  const [locked, setLocked] = useState(true);
  const [hasVault, setHasVault] = useState(() => hasStoredVault());
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>(INITIAL_ACTIVITY);

  const keyRef = useRef<CryptoKey | null>(null);
  const saltRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const justLoadedRef = useRef(false);

  // Always-current snapshot, so lock() can flush the latest edit even if a
  // debounced save was still pending.
  const dataRef = useRef<LedgerData>(EMPTY_LEDGER);
  dataRef.current = { resentments, fears, sexConduct, assets, haltTasks, halt, contacts };

  const note = (msg: string) =>
    setActivityLog((l) => [{ at: new Date().toISOString(), msg }, ...l].slice(0, 24));

  const applyData = (d: LedgerData) => {
    setResentments(d.resentments);
    setFears(d.fears);
    setSexConduct(d.sexConduct);
    setAssets(d.assets);
    setHaltTasks(d.haltTasks);
    setHalt(d.halt);
    setContacts(d.contacts ?? SEED_CONTACTS);
  };

  // Persist (debounced) whenever the decrypted data changes while unlocked.
  useEffect(() => {
    if (locked || !keyRef.current || !saltRef.current) return;
    if (justLoadedRef.current) {
      justLoadedRef.current = false;
      return;
    }
    const key = keyRef.current;
    const salt = saltRef.current;
    const snapshot = dataRef.current;
    const t = setTimeout(() => void writeVault(key, salt, snapshot), 200);
    return () => clearTimeout(t);
  }, [resentments, fears, sexConduct, assets, haltTasks, halt, contacts, locked]);

  const defectTallies = useMemo(() => computeDefectTallies(resentments), [resentments]);
  const fearCount = useMemo(() => computeFearCount(fears, resentments), [fears, resentments]);
  const assetTallies = useMemo(() => computeAssetTallies(assets), [assets]);

  const sealResentment = (r: DraftResentment) => {
    note("Saved a resentment row to your private list.");
    setResentments((rs) => [...rs, { ...r, sealed: true, sealedAt: new Date().toISOString() }]);
  };
  const sealFear = (f: Omit<Fear, "sealed">) => {
    note("Saved a fear to your private list.");
    setFears((fs) => [...fs, { ...f, sealed: true }]);
  };
  const sealSex = (s: Omit<SexConduct, "sealed">) => {
    note("Saved a sex-conduct row.");
    setSexConduct((ss) => [...ss, { ...s, sealed: true }]);
  };
  const addAsset = (virtue: Virtue, noteText: string) => {
    note(`Logged a ${virtue.toLowerCase()} moment.`);
    setAssets((as) => [{ id: makeId("a-"), virtue, note: noteText, at: new Date().toISOString() }, ...as]);
  };
  const toggleTask = (id: string) =>
    setHaltTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const resetHalt = () => {
    note("Reset the HALT check. Starting the day over.");
    setHalt({ H: 0, A: 0, L: 0, T: 0 });
  };

  const addContact = (c: Omit<Contact, "id">) => {
    note(`Saved ${c.label.trim().toLowerCase() || "a contact"} to your contacts.`);
    setContacts((cs) => [...cs, { ...c, id: makeId("c-") }]);
  };
  const updateContact = (id: string, patch: Partial<Omit<Contact, "id">>) =>
    setContacts((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const removeContact = (id: string) => setContacts((cs) => cs.filter((c) => c.id !== id));

  const setupPin = async (pin: string) => {
    const { key, salt } = await createVault<LedgerData>(pin, SEED_LEDGER);
    keyRef.current = key;
    saltRef.current = salt;
    justLoadedRef.current = true;
    applyData(SEED_LEDGER);
    setHasVault(true);
    note("Created your code. Your notes are encrypted on this device.");
    setLocked(false);
  };

  const unlock = async (pin: string): Promise<boolean> => {
    const opened = await openVault<LedgerData>(pin);
    if (!opened) return false;
    keyRef.current = opened.key;
    saltRef.current = opened.salt;
    justLoadedRef.current = true;
    applyData(opened.data);
    note("Unlocked for this session.");
    setLocked(false);
    return true;
  };

  const doLock = (msg: string) => {
    const key = keyRef.current;
    const salt = saltRef.current;
    if (key && salt) void writeVault(key, salt, dataRef.current);
    note(msg);
    keyRef.current = null;
    saltRef.current = null;
    applyData(EMPTY_LEDGER);
    setLocked(true);
  };
  const lock = () => doLock("Locked. Your notes are closed.");

  // Soft auto-lock: two minutes hidden or unfocused will lock, so a brief
  // tab-switch doesn't punish you. Locking clears the key from memory.
  useEffect(() => {
    if (locked) return;
    const IDLE_MS = 2 * 60 * 1000;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const armed = (why: string) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => doLock(`Locked after two minutes ${why}.`), IDLE_MS);
    };
    const disarm = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };
    const onVis = () => (document.visibilityState === "hidden" ? armed("away") : disarm());
    const onBlur = () => armed("unfocused");
    const onFocus = () => disarm();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      disarm();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked]);

  // Escape toggles the privacy blind while unlocked.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // While an overlay is open, let it own Escape (close itself) instead.
      if (e.key === "Escape" && !locked && !anyOverlayOpen()) {
        e.preventDefault();
        setPrivacyMode((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [locked]);

  const value: LedgerContextValue = {
    resentments,
    fears,
    sexConduct,
    assets,
    haltTasks,
    halt,
    privacyMode,
    locked,
    hasVault,
    activityLog,
    setPrivacyMode,
    setHalt,
    setHaltTasks,
    toggleTask,
    resetHalt,
    sealResentment,
    sealFear,
    sealSex,
    addAsset,
    contacts,
    addContact,
    updateContact,
    removeContact,
    defectTallies,
    fearCount,
    assetTallies,
    setupPin,
    unlock,
    lock,
  };

  return <LedgerContext value={value}>{children}</LedgerContext>;
}

export function useLedger(): LedgerContextValue {
  const ctx = useContext(LedgerContext);
  if (!ctx) throw new Error("useLedger must be used within a LedgerProvider");
  return ctx;
}
