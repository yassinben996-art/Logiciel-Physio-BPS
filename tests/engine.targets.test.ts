import { describe, expect, it } from 'vitest';
import { analyze } from '../src/engine/analyze';
import { targets } from '../src/engine/targets';
import { interventions } from '../src/engine/interventions';
import { emptyCase, fromExample } from '../src/state/case';
import type { CaseState, DomainId } from '../src/engine/types';

const T = (s: CaseState, id: DomainId) => targets(id, s, analyze(s));

describe('cibles chiffrées « départ → objectif »', () => {
  const marie = fromExample('cervical');
  it('douleur : −20 % avec virgule décimale', () => {
    expect(T(marie, 1)[0]).toBe(
      'Douleur : réduction d’au moins 20 % (6/10 vers 4,8/10 ou moins). Seuil minimal utilisé dans les essais PDDM.',
    );
  });
  it('incapacité avec instrument et PGIC', () => {
    expect(T(marie, 1)[1]).toMatch(
      /^Incapacité \(NDI\) : réduction d’au moins 20 % par rapport à 46 %.*PGIC ≥ 3/,
    );
  });
  it('objectif du patient repris mot pour mot', () => {
    expect(T(marie, 1)).toContain(`Retrouver l’activité choisie par le patient : ${marie.goal}`);
    expect(T(emptyCase(), 1)).toContain('Retrouver une activité choisie par le patient (à nommer).');
  });
  it('volet 5 : attentes, peur (FABQ), croyance, inquiétude', () => {
    const t = T(marie, 5);
    expect(t).toContain('Attentes de récupération : 3/10 vers 6/10 ou plus.');
    expect(
      t.some((x) => x.startsWith('Peur du mouvement : 7/10 vers 4/10 ou moins. Si FABQ : −4 points')),
    ).toBe(true);
    expect(t).toContain('Inquiétude : 8/10 vers 4/10 ou moins.');
  });
  it('volet 2 : CSI vers sous le seuil', () => {
    expect(T(fromExample('lumbar'), 2)).toContain('CSI-9 : 24 vers un score sous 20.');
  });
  it('volet 3 : painDETECT vers moins de 13', () => {
    expect(T(fromExample('lumbar'), 3)).toContain('painDETECT : 15 vers moins de 13.');
    expect(T({ ...emptyCase(), pd: 12 }, 3)).not.toContain('painDETECT : 12 vers moins de 13.');
  });
  it('douleur décimale', () => {
    expect(T({ ...emptyCase(), pain: 6.5 }, 1)[0]).toMatch(/\(6,5\/10 vers 5,2\/10 ou moins\)/);
  });
  it('chaque volet allumé des exemples a au moins une cible et une intervention', () => {
    for (const r of ['cervical', 'lumbar', 'shoulder'] as const) {
      const s = fromExample(r);
      const X = analyze(s);
      X.order
        .filter((i) => X.A[i].level > 0)
        .forEach((i) => {
          expect(targets(i, s, X).length, `${r} volet ${i}`).toBeGreaterThan(0);
          expect(interventions(i, s, X).length, `${r} volet ${i}`).toBeGreaterThan(0);
        });
    }
  });
});
