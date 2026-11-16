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
import { fromExample, resetCase, withRegion } from './case';

export type OpenMap = Partial<Record<DomainId, boolean>>;

export interface AppState {
  c: CaseState;
  /** État ouvert/fermé de chaque branche de l'arbre ; absent = défaut (2 premiers prioritaires). */
  open: OpenMap;
  hideEmpty: boolean;
}

type NumField = 'pain' | 'dis' | 'csi' | 'pd';

export type Action =
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

export const initialState = (): AppState => ({ c: fromExample('cervical'), open: {}, hideEmpty: false });

export function reducer(st: AppState, a: Action): AppState {
  const c = st.c;
  const set = (patch: Partial<CaseState>): AppState => ({ ...st, c: { ...c, ...patch } });
  switch (a.type) {
    case 'region':
      return a.region === c.region ? st : { ...st, c: withRegion(c, a.region) };
    case 'example':
      return { ...st, c: fromExample(a.region), open: {} };
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
