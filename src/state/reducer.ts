import type {
  CaseState,
  CsiType,
  DomainId,
  Duration,
  Onset,
  Region,
  SliderId,
  StartRisk,
} from '../engine/types';
import { QUESTIONNAIRES } from '@q';
import { appliesTo, scoreQ } from '../questionnaires/scoring';
import type { QDef } from '../questionnaires/types';
import { emptyCase, fromExample, resetCase, withRegion } from './case';

export type OpenMap = Partial<Record<DomainId, boolean>>;

/** welcome = accueil patient ; patient = questions ; done = merci ; clinician = espace physio. */
export type Mode = 'welcome' | 'patient' | 'done' | 'clinician';

export interface View {
  mode: Mode;
  /** Étape du parcours patient. */
  p: number;
  /** Étape de l'espace physio. */
  c: number;
  /** Le patient a choisi sa zone (la région a une valeur par défaut dans l'état du cas). */
  regionChosen: boolean;
}

/** Réponses aux questionnaires intégrés : id du questionnaire → id de l'item → valeur. */
export type QAnswers = Readonly<Record<string, Readonly<Record<string, number>>>>;

export interface AppState {
  view: View;
  c: CaseState;
  qa: QAnswers;
  /** État ouvert/fermé de chaque branche de l'arbre ; absent = défaut (2 premiers prioritaires). */
  open: OpenMap;
  hideEmpty: boolean;
}

export const initialView = (): View => ({ mode: 'welcome', p: 0, c: 0, regionChosen: false });

type NumField = 'pain' | 'dis' | 'csi' | 'pd';

export type Action =
  | { type: 'mode'; mode: Mode }
  | { type: 'pstep'; n: number }
  | { type: 'cstep'; n: number }
  | { type: 'newPatient' }
  | { type: 'qanswer'; q: string; item: string; value: number; index?: number }
  | { type: 'region'; region: Region }
  | { type: 'example'; region: Region }
  | { type: 'reset' }
  | { type: 'label'; value: string }
  | { type: 'goal'; value: string }
  | { type: 'duration'; value: Duration }
  | { type: 'onset'; value: Onset }
  | { type: 'start'; value: StartRisk }
  | { type: 'instr'; value: string }
  | { type: 'csiType'; value: CsiType }
  | { type: 'num'; field: NumField; value: number | null }
  | { type: 'check'; id: string; value: boolean }
  | { type: 'slider'; id: SliderId; value: number | null }
  | { type: 'open'; id: DomainId; value: boolean }
  | { type: 'openMany'; ids: DomainId[]; value: boolean }
  | { type: 'setOpen'; open: OpenMap }
  | { type: 'hideEmpty'; value: boolean };

export const initialState = (): AppState => ({
  view: initialView(),
  c: emptyCase(),
  qa: {},
  open: {},
  hideEmpty: false,
});

/**
 * Reporte dans le cas clinique les scores VALIDES des questionnaires remplis par le patient :
 * incapacité (questionnaire de la région) et painDETECT. Un score invalide ne modifie rien.
 */
export function deriveScores(c: CaseState, qa: QAnswers, list: readonly QDef[] = QUESTIONNAIRES): CaseState {
  let next = c;
  for (const q of list) {
    if (!q.feeds || !appliesTo(q, c.region)) continue;
    const r = scoreQ(q, qa[q.id]);
    if (!r?.valid) continue;
    if (q.feeds.field === 'dis') next = { ...next, instr: q.feeds.instr, dis: r.value };
    else next = { ...next, pd: r.value };
  }
  return next;
}

export function reducer(st: AppState, a: Action): AppState {
  const c = st.c;
  const set = (patch: Partial<CaseState>): AppState => ({ ...st, c: { ...c, ...patch } });
  switch (a.type) {
    case 'mode':
      return { ...st, view: { ...st.view, mode: a.mode } };
    case 'pstep':
      return { ...st, view: { ...st.view, p: Math.max(0, a.n) } };
    case 'cstep':
      return { ...st, view: { ...st.view, c: Math.max(0, a.n) } };
    case 'newPatient':
      return initialState();
    case 'qanswer': {
      // « item# » garde l'index de la réponse choisie (deux options peuvent valoir le même score).
      const entry: Record<string, number> = { ...st.qa[a.q], [a.item]: a.value };
      if (a.index !== undefined) entry[`${a.item}#`] = a.index;
      const qa = { ...st.qa, [a.q]: entry };
      return { ...st, qa, c: deriveScores(c, qa) };
    }
    case 'region': {
      const view = { ...st.view, regionChosen: true };
      return a.region === c.region
        ? { ...st, view }
        : { ...st, view, c: deriveScores(withRegion(c, a.region), st.qa) };
    }
    case 'example':
      return { ...st, c: fromExample(a.region), open: {}, view: { ...st.view, regionChosen: true } };
    case 'reset':
      return { ...st, c: resetCase(c), open: {} };
    case 'label':
      return set({ label: a.value });
    case 'goal':
      return set({ goal: a.value });
    case 'duration':
      return set({ duration: a.value });
    case 'onset':
      return set({ onset: a.value });
    case 'start':
      return set({ start: a.value });
    case 'instr':
      return set({ instr: a.value });
    case 'csiType':
      return set({ csiType: a.value });
    case 'num':
      return set({ [a.field]: a.value });
    case 'check': {
      const chk = { ...c.chk };
      if (a.value) chk[a.id] = true;
      else delete chk[a.id];
      return set({ chk });
    }
    case 'slider':
      return set({ sl: { ...c.sl, [a.id]: a.value } });
    case 'open':
      return { ...st, open: { ...st.open, [a.id]: a.value } };
    case 'openMany':
      return { ...st, open: { ...st.open, ...Object.fromEntries(a.ids.map((i) => [i, a.value])) } };
    case 'setOpen':
      return { ...st, open: a.open };
    case 'hideEmpty':
      return { ...st, hideEmpty: a.value };
  }
}
