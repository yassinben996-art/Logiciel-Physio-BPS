// Test différentiel : le moteur porté doit donner exactement les mêmes résultats que les
// fonctions analyze(), targets() et interventions() du prototype de référence, sur des
// milliers de cas générés aléatoirement (graine fixe → reproductible).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { analyze } from '../src/engine/analyze';
import { targets } from '../src/engine/targets';
import { interventions } from '../src/engine/interventions';
import { REGION } from '../src/data/regions';
import { D2, D4, D4B, D5B, D6 } from '../src/data/items';
import { EX } from '../src/data/examples';
import type { CaseState, DomainId, Region, SliderId } from '../src/engine/types';

const html = fs.readFileSync(path.resolve(process.cwd(), 'reference/prototype.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]!);
const engineSrc = scripts[1]!.split('/* ============ FORMULAIRES')[0]!;

interface Proto {
  S: Record<string, unknown>;
  analyze: () => {
    A: Record<
      number,
      { level: number; sub: string; reasons: string[]; score: number; refer: string[]; note?: string }
    >;
    order: number[];
    flags: { u: string[][]; m: string[][] };
  };
  targets: (id: number, X: unknown) => string[];
  interventions: (id: number, X: unknown) => { t: string; d: string; ev: string; r: string[] }[];
  EX: Record<string, Record<string, unknown>>;
}

const ctx: Record<string, unknown> = {};
vm.createContext(ctx);
vm.runInContext(scripts[0]! + '\n' + engineSrc + '\nglobalThis.P={S,analyze,targets,interventions,EX};', ctx);
const P = ctx.P as Proto;

// Générateur pseudo-aléatoire déterministe (mulberry32).
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const REGIONS: Region[] = ['cervical', 'lumbar', 'shoulder'];
const SLIDERS: SliderId[] = ['exp', 'eff', 'fear', 'worry', 'struct', 'dist'];

function randomCase(r: () => number): CaseState {
  const pick = <T>(a: readonly T[]): T => a[Math.floor(r() * a.length)]!;
  const region = pick(REGIONS);
  const R = REGION[region];
  const ids = [...R.flags, ...R.d1, ...R.d3, ...D2, ...D4, D4B, ...D5B, ...D6].map((i) => i.id);
  const density = r();
  const chk: Record<string, boolean> = {};
  ids.forEach((id) => {
    if (r() < density * 0.6) chk[id] = true;
  });
  const maybe = (f: () => number) => (r() < 0.25 ? null : f());
  const sl = Object.fromEntries(
    SLIDERS.map((k) => [k, maybe(() => Math.floor(r() * 11))]),
  ) as CaseState['sl'];
  return {
    region,
    label: '',
    duration: pick(['lt6w', '6w3m', 'gt3m'] as const),
    onset: pick(['nontrauma', 'trauma', 'postop'] as const),
    start: pick(['na', 'low', 'medium', 'high'] as const),
    pain: maybe(() => Math.floor(r() * 21) / 2),
    instr: pick(R.instr).id,
    dis: maybe(() => Math.floor(r() * 101)),
    csiType: pick(['csi9', 'csi25'] as const),
    csi: maybe(() => Math.floor(r() * 60)),
    pd: maybe(() => Math.floor(r() * 40) - 1),
    chk,
    sl,
    goal: r() < 0.5 ? '' : 'Reprendre la natation',
  };
}

function setProto(s: CaseState) {
  Object.assign(P.S, JSON.parse(JSON.stringify(s)));
}

/** Le port affiche les décimales à la française (4,8) ; le prototype affichait 4.8. */
const frDigits = (x: string) => x.replace(/(\d)\.(\d)/g, '$1,$2');

describe('parité avec le prototype', () => {
  it('analyze / targets / interventions identiques sur 3000 cas aléatoires', () => {
    const r = rng(20261116);
    for (let n = 0; n < 3000; n++) {
      const s = randomCase(r);
      setProto(s);
      const PX = P.analyze();
      const X = analyze(s);
      expect(X.order, `cas ${n}`).toEqual(PX.order);
      for (const id of [1, 2, 3, 4, 5, 6] as DomainId[]) {
        const a = X.A[id];
        const b = PX.A[id]!;
        expect({ ...a, note: a.note ?? '' }, `cas ${n} volet ${id}`).toEqual({ ...b, note: b.note ?? '' });
        expect(targets(id, s, X), `cas ${n} cibles ${id}`).toEqual(P.targets(id, PX).map(frDigits));
        expect(interventions(id, s, X), `cas ${n} interventions ${id}`).toEqual(
          JSON.parse(JSON.stringify(P.interventions(id, PX))),
        );
      }
      expect(X.flags.u.map((f) => f.id)).toEqual(PX.flags.u.map((f) => f[0]));
      expect(X.flags.m.map((f) => f.id)).toEqual(PX.flags.m.map((f) => f[0]));
    }
  });

  it('les trois cas d’exemple sont identiques à EX du prototype', () => {
    for (const r of REGIONS) {
      expect(JSON.parse(JSON.stringify(P.EX[r]))).toEqual(EX[r].state);
    }
  });
});
