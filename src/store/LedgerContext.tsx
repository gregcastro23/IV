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
  DefectKey,
  Fear,
  Halt,
  HaltTask,
  LedgerData,
  Resentment,
  SexConduct,
  Virtue,
} from "../types.ts";
import { DEFECT_KEYS, VIRTUE_KEYS, makeId } from "../data/constants.ts";
import {
  INITIAL_ACTIVITY,
  SEED_ASSETS,
  SEED_FEARS,
  SEED_HALT,
  SEED_HALT_TASKS,
  SEED_RESENTMENTS,
  SEED_SEX,
} from "../data/seed.ts";
import { loadJSON, saveJSON } from "../lib/storage.ts";

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

  defectTallies: Record<DefectKey, number>;
  fearCount: number;
  assetTallies: Record<Virtue, number>;

  lock: () => void;
  unlock: () => void;
}

const LedgerContext = createContext<LedgerContextValue | null>(null);

const SEED_LEDGER: LedgerData = {
  resentments: SEED_RESENTMENTS,
  fears: SEED_FEARS,
  sexConduct: SEED_SEX,
  assets: SEED_ASSETS,
  haltTasks: SEED_HALT_TASKS,
  halt: SEED_HALT,
};

export function LedgerProvider({ children }: PropsWithChildren) {
  // Load the persisted ledger exactly once (seed on first run).
  const initialRef = useRef<LedgerData | null>(null);
  if (initialRef.current === null) {
    initialRef.current = loadJSON<LedgerData>("ledger", SEED_LEDGER);
  }
  const initial = initialRef.current;

  const [resentments, setResentments] = useState<Resentment[]>(initial.resentments);
  const [fears, setFears] = useState<Fear[]>(initial.fears);
  const [sexConduct, setSexConduct] = useState<SexConduct[]>(initial.sexConduct);
  const [assets, setAssets] = useState<Asset[]>(initial.assets);
  const [haltTasks, setHaltTasks] = useState<HaltTask[]>(initial.haltTasks);
  const [halt, setHalt] = useState<Halt>(initial.halt);

  // Session-only: always start locked, never restore the blind, fresh log.
  const [privacyMode, setPrivacyMode] = useState(false);
  const [locked, setLocked] = useState(true);
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>(INITIAL_ACTIVITY);

  // Persist the whole ledger whenever any slice changes.
  useEffect(() => {
    saveJSON<LedgerData>("ledger", {
      resentments,
      fears,
      sexConduct,
      assets,
      haltTasks,
      halt,
    });
  }, [resentments, fears, sexConduct, assets, haltTasks, halt]);

  const note = (msg: string) =>
    setActivityLog((l) => [{ at: new Date().toISOString(), msg }, ...l].slice(0, 24));

  const defectTallies = useMemo(() => {
    const t = Object.fromEntries(DEFECT_KEYS.map((d) => [d.key, 0])) as Record<DefectKey, number>;
    resentments.forEach((r) => {
      if (!r.sealed) return;
      DEFECT_KEYS.forEach((d) => {
        if (r.defects[d.key]) t[d.key] += 1;
      });
    });
    return t;
  }, [resentments]);

  const fearCount = useMemo(() => {
    let n = fears.filter((f) => f.sealed).length;
    resentments.forEach((r) => {
      if (!r.sealed) return;
      Object.values(r.affects).forEach((a) => {
        if (a && a.on && a.fear && a.fear.trim()) n += 1;
      });
    });
    return n;
  }, [fears, resentments]);

  const assetTallies = useMemo(() => {
    const t = Object.fromEntries(VIRTUE_KEYS.map((v) => [v, 0])) as Record<Virtue, number>;
    assets.forEach((a) => {
      if (t[a.virtue] != null) t[a.virtue] += 1;
    });
    return t;
  }, [assets]);

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

  const lock = () => {
    note("Locked. Your notes are closed.");
    setLocked(true);
  };
  const unlock = () => {
    note("Unlocked for this session.");
    setLocked(false);
  };

  // Soft auto-lock: two minutes hidden or unfocused will lock, so a brief
  // tab-switch doesn't punish you.
  useEffect(() => {
    if (locked) return;
    const IDLE_MS = 2 * 60 * 1000;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const armed = (why: string) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        note(`Locked after two minutes ${why}.`);
        setLocked(true);
      }, IDLE_MS);
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
  }, [locked]);

  // Escape toggles the privacy blind while unlocked.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !locked) {
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
    defectTallies,
    fearCount,
    assetTallies,
    lock,
    unlock,
  };

  return <LedgerContext value={value}>{children}</LedgerContext>;
}

export function useLedger(): LedgerContextValue {
  const ctx = useContext(LedgerContext);
  if (!ctx) throw new Error("useLedger must be used within a LedgerProvider");
  return ctx;
}
