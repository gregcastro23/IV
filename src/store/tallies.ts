// Pure aggregations over the ledger, extracted so they can be unit-tested
// independently of React.
import type { Asset, DefectKey, Fear, Resentment, Virtue } from "../types.ts";
import { DEFECT_KEYS, VIRTUE_KEYS } from "../data/constants.ts";

export function computeDefectTallies(resentments: Resentment[]): Record<DefectKey, number> {
  const t = Object.fromEntries(DEFECT_KEYS.map((d) => [d.key, 0])) as Record<DefectKey, number>;
  resentments.forEach((r) => {
    if (!r.sealed) return;
    DEFECT_KEYS.forEach((d) => {
      if (r.defects[d.key]) t[d.key] += 1;
    });
  });
  return t;
}

/** Sealed standalone fears plus every bracketed fear from sealed resentments. */
export function computeFearCount(fears: Fear[], resentments: Resentment[]): number {
  let n = fears.filter((f) => f.sealed).length;
  resentments.forEach((r) => {
    if (!r.sealed) return;
    Object.values(r.affects).forEach((a) => {
      if (a && a.on && a.fear && a.fear.trim()) n += 1;
    });
  });
  return n;
}

export function computeAssetTallies(assets: Asset[]): Record<Virtue, number> {
  const t = Object.fromEntries(VIRTUE_KEYS.map((v) => [v, 0])) as Record<Virtue, number>;
  assets.forEach((a) => {
    if (t[a.virtue] != null) t[a.virtue] += 1;
  });
  return t;
}
