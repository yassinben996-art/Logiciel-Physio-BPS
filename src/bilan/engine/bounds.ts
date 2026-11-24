// Une valeur stockée hors des bornes ACTUELLES du contenu (bornes resserrées après coup) est ignorée
// partout, comme une saisie hors plage (DECISIONS n° 2).
import type { ZoneDef } from '../content/types';
import type { BilanState } from '../state/bilan';

export function withinBounds(z: ZoneDef, s: BilanState): BilanState {
  const bounds = new Map<string, { min: number; max: number }>();
  for (const sec of z.sections)
    for (const f of sec.fields)
      if (f.kind === 'number') {
        const k = `${sec.id}.${f.id}`;
        for (const key of f.sided ? [`${k}.D`, `${k}.G`] : [k]) bounds.set(key, f);
      }
  const nums = Object.fromEntries(
    Object.entries(s.nums).filter(([k, v]) => {
      const b = bounds.get(k);
      return !b || (v >= b.min && v <= b.max);
    }),
  );
  return Object.keys(nums).length === Object.keys(s.nums).length ? s : { ...s, nums };
}
