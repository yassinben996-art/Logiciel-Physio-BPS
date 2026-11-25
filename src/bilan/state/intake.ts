// Réponses de l'accueil rempli par le patient. Toujours nettoyées avant d'entrer dans le bilan.
import { BODY_REGION_IDS } from '../content/body';
import { SCREENING_IDS } from '../content/intake';
import type { Duration, Onset } from '../../engine/types';

export interface PsfsItem {
  activity: string;
  score: number | null;
}
export interface Intake {
  painNow: number | null;
  painWorst: number | null;
  duration: Duration | null;
  onset: Onset | null;
  /** Ids de BODY_REGIONS. */
  regions: readonly string[];
  /** 3 activités au plus. */
  psfs: readonly PsfsItem[];
  screening: Readonly<Record<string, boolean>>;
  /** ISO, '' tant que non terminé. */
  completedAt: string;
}

const DURATIONS: readonly Duration[] = ['lt6w', '6w3m', 'gt3m'];
const ONSETS: readonly Onset[] = ['nontrauma', 'trauma', 'postop'];
export const PSFS_MAX = 3;

export const emptyIntake = (): Intake => ({
  painNow: null,
  painWorst: null,
  duration: null,
  onset: null,
  regions: [],
  psfs: [],
  screening: {},
  completedAt: '',
});

const score010 = (v: number | null): number | null =>
  v !== null && Number.isInteger(v) && v >= 0 && v <= 10 ? v : null;

export function sanitizeIntake(i: Intake): Intake {
  return {
    painNow: score010(i.painNow),
    painWorst: score010(i.painWorst),
    duration: i.duration && DURATIONS.includes(i.duration) ? i.duration : null,
    onset: i.onset && ONSETS.includes(i.onset) ? i.onset : null,
    regions: [...new Set(i.regions.filter((r) => BODY_REGION_IDS.has(r)))],
    psfs: i.psfs
      .map((p) => ({ activity: p.activity.trim().slice(0, 120), score: score010(p.score) }))
      .filter((p) => p.activity !== '')
      .slice(0, PSFS_MAX),
    screening: Object.fromEntries(
      Object.entries(i.screening).filter(([k, v]) => SCREENING_IDS.has(k) && typeof v === 'boolean'),
    ),
    completedAt: i.completedAt,
  };
}
