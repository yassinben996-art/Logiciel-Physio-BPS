/** 0 = sans signal, 1 = à surveiller, 2 = présent. */
export type Level = 0 | 1 | 2;
export type Sub = '' | 'A' | 'B' | 'A+B';
export type Region = 'cervical' | 'lumbar' | 'shoulder';
export type Evidence = 'CPG' | 'RCT' | 'OBS' | 'EXP' | 'NR';
export type DomainId = 1 | 2 | 3 | 4 | 5 | 6;
export type Duration = 'lt6w' | '6w3m' | 'gt3m';
export type Onset = 'nontrauma' | 'trauma' | 'postop';
export type StartRisk = 'na' | 'low' | 'medium' | 'high';
export type CsiType = 'csi9' | 'csi25';
export type SliderId = 'exp' | 'eff' | 'fear' | 'worry' | 'struct' | 'dist';

export interface Reference {
  key: string;
  title: string;
  url: string | null;
}

export interface DomainDef {
  id: DomainId;
  name: string;
  short: string;
  /** Nom de la variable CSS de la couleur pleine (ex. « --c1 »). */
  c: string;
  /** Nom de la variable CSS de la teinte (ex. « --t1 »). */
  t: string;
}

export interface Item {
  id: string;
  label: string;
}

/** Drapeau rouge : u = orienter sans attendre, m = avis médical rapide. */
export interface FlagItem extends Item {
  kind: 'u' | 'm';
}

/** Volet 1 : mk = marqueur, dp = préférence directionnelle, B = absence d'amélioration. */
export interface D1Item extends Item {
  kind: 'mk' | 'dp' | 'B';
}

/** Volet 3 : rad, def, test, sym (brûlure), B (signe de gravité). */
export interface D3Item extends Item {
  kind: 'rad' | 'def' | 'test' | 'sym' | 'B';
}

export interface EnvItem extends Item {
  sub: 'A' | 'B';
}

export interface SliderDef {
  id: SliderId;
  label: string;
  lo: string;
  hi: string;
}

export interface Instrument {
  id: string;
  label: string;
}

export interface RegionDef {
  name: string;
  pain: string;
  instr: readonly Instrument[];
  model: string;
  flags: readonly FlagItem[];
  d1: readonly D1Item[];
  d3: readonly D3Item[];
}

export type Sliders = Record<SliderId, number | null>;

/** Données saisies par le clinicien (entrée unique du moteur). */
export interface CaseState {
  region: Region;
  label: string;
  duration: Duration;
  onset: Onset;
  start: StartRisk;
  pain: number | null;
  instr: string;
  dis: number | null;
  csiType: CsiType;
  csi: number | null;
  pd: number | null;
  chk: Readonly<Record<string, boolean>>;
  sl: Sliders;
  goal: string;
  /** Scores de questionnaires pouvant allumer le volet 5 (au plus « à surveiller »). */
  tsk?: number | null;
  fabqW?: number | null;
}

export interface DomainResult {
  level: Level;
  sub: Sub;
  reasons: string[];
  score: number;
  refer: string[];
  note?: string;
}

export interface Analysis {
  A: Record<DomainId, DomainResult>;
  order: DomainId[];
  flags: { u: FlagItem[]; m: FlagItem[] };
  csiPos: boolean;
  cut: number;
  startRisk: boolean;
}

export interface Intervention {
  t: string;
  d: string;
  ev: Evidence;
  /** Clés de REFS. */
  r: string[];
}
