import { describe, expect, it } from 'vitest';
import { initialState, reducer } from '../src/state/reducer';

describe('reducer', () => {
  it('démarre vide, sur l’accueil patient', () => {
    const s = initialState();
    expect(s.c.label).toBe('');
    expect(s.c.chk).toEqual({});
    expect(s.view).toEqual({ mode: 'welcome', p: 0, c: 0, regionChosen: false });
  });
  it('choisir la région la marque comme choisie, même si c’est la valeur par défaut', () => {
    expect(reducer(initialState(), { type: 'region', region: 'cervical' }).view.regionChosen).toBe(true);
  });
  it('nouveau patient : tout est remis à zéro', () => {
    let s = reducer(initialState(), { type: 'example', region: 'lumbar' });
    s = reducer(s, { type: 'mode', mode: 'clinician' });
    s = reducer(s, { type: 'newPatient' });
    expect(s).toEqual(initialState());
  });
  it('l’état des branches survit aux changements de formulaire', () => {
    let s = reducer(initialState(), { type: 'open', id: 3, value: true });
    s = reducer(s, { type: 'check', id: 'co_cv', value: true });
    s = reducer(s, { type: 'num', field: 'pain', value: 4 });
    s = reducer(s, { type: 'region', region: 'lumbar' });
    expect(s.open[3]).toBe(true);
  });
  it('charger un exemple ou réinitialiser remet l’état des branches par défaut', () => {
    const s = reducer(reducer(initialState(), { type: 'example', region: 'cervical' }), {
      type: 'open',
      id: 3,
      value: true,
    });
    expect(reducer(s, { type: 'example', region: 'shoulder' }).open).toEqual({});
    const r = reducer(s, { type: 'reset' });
    expect(r.open).toEqual({});
    expect(r.c.chk).toEqual({});
    expect(r.c.region).toBe('cervical');
  });
  it('décocher supprime la clé', () => {
    const s0 = reducer(initialState(), { type: 'check', id: 'a_mech', value: true });
    const s = reducer(s0, { type: 'check', id: 'a_mech', value: false });
    expect('a_mech' in s.c.chk).toBe(false);
  });
});

describe('scores des questionnaires', () => {
  it('reporte le score valide du questionnaire de la région, ignore les autres', async () => {
    const { deriveScores } = await import('../src/state/reducer');
    const { emptyCase } = await import('../src/state/case');
    const ndi = {
      id: 'ndi',
      name: 'NDI',
      regions: ['cervical'] as const,
      feeds: { field: 'dis', instr: 'NDI' } as const,
      source: '',
      pages: [],
      scoring: { kind: 'sections-percent', items: ['a', 'b'] } as const,
    };
    const pd = {
      id: 'pd',
      name: 'pD',
      regions: 'all' as const,
      feeds: { field: 'pd' } as const,
      source: '',
      pages: [],
      scoring: { kind: 'paindetect', items: ['p1'], course: 'c', radiation: 'r' } as const,
    };
    const c = deriveScores(emptyCase('cervical'), { ndi: { a: 5, b: 0 }, pd: { p1: 5, c: 1, r: 2 } }, [ndi, pd]);
    expect([c.instr, c.dis, c.pd]).toEqual(['NDI', 50, 8]);
    // Région différente : le NDI ne s'applique pas
    expect(deriveScores(emptyCase('lumbar'), { ndi: { a: 5, b: 5 } }, [ndi]).dis).toBeNull();
    // painDETECT incomplet : rien n'est reporté
    expect(deriveScores(emptyCase(), { pd: { p1: 5 } }, [pd]).pd).toBeNull();
  });
});
