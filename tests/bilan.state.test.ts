import { bilanReducer, emptyBilan, isDirty } from '../src/bilan/state/bilan';

const e = emptyBilan('shoulder');

describe('bilanReducer', () => {
  it('num dans les bornes', () => {
    const s = bilanReducer(e, { type: 'num', key: 'mobilite.abd_a.D', value: 150, min: 0, max: 200 });
    expect(s.nums['mobilite.abd_a.D']).toBe(150);
    expect(s.invalid['mobilite.abd_a.D']).toBeUndefined();
  });
  it('num hors bornes → invalide, ignoré', () => {
    const a = bilanReducer(e, { type: 'num', key: 'k', value: 120, min: 0, max: 200 });
    const s = bilanReducer(a, { type: 'num', key: 'k', value: 500, min: 0, max: 200 });
    expect(s.nums.k).toBeUndefined();
    expect(s.invalid.k).toBe(true);
  });
  it('num négatif → invalide', () => {
    const s = bilanReducer(e, { type: 'num', key: 'k', value: -1, min: 0, max: 100 });
    expect(s.nums.k).toBeUndefined();
    expect(s.invalid.k).toBe(true);
  });
  it('num null → retiré de nums et invalid', () => {
    const a = bilanReducer(e, { type: 'num', key: 'k', value: 500, min: 0, max: 200 });
    const b = bilanReducer(a, { type: 'num', key: 'j', value: 5, min: 0, max: 200 });
    const s = bilanReducer(bilanReducer(b, { type: 'num', key: 'k', value: null, min: 0, max: 200 }), {
      type: 'num',
      key: 'j',
      value: null,
      min: 0,
      max: 200,
    });
    expect('k' in s.invalid).toBe(false);
    expect('j' in s.nums).toBe(false);
  });
  it('test null → retiré', () => {
    const a = bilanReducer(e, { type: 'test', key: 'tests.full_can', value: 'pos' });
    expect(a.tests['tests.full_can']).toBe('pos');
    expect(
      'tests.full_can' in bilanReducer(a, { type: 'test', key: 'tests.full_can', value: null }).tests,
    ).toBe(false);
  });
  it('chip false → retiré', () => {
    const a = bilanReducer(e, { type: 'chip', key: 'a.b.c', value: true });
    expect(a.chips['a.b.c']).toBe(true);
    expect('a.b.c' in bilanReducer(a, { type: 'chip', key: 'a.b.c', value: false }).chips).toBe(false);
  });
  it('choice null → retiré', () => {
    const a = bilanReducer(e, { type: 'choice', key: 'a.b', value: 'x' });
    expect('a.b' in bilanReducer(a, { type: 'choice', key: 'a.b', value: null }).choices).toBe(false);
  });
  it('accept deux fois → une seule occurrence', () => {
    const s = bilanReducer(bilanReducer(e, { type: 'accept', id: 'r' }), { type: 'accept', id: 'r' });
    expect(s.accepted).toEqual(['r']);
  });
  it('dismiss deux fois → une seule occurrence', () => {
    const s = bilanReducer(bilanReducer(e, { type: 'dismiss', id: 'r' }), { type: 'dismiss', id: 'r' });
    expect(s.dismissed).toEqual(['r']);
  });
  it('isDirty', () => {
    expect(isDirty(e)).toBe(false);
    expect(isDirty(bilanReducer(e, { type: 'note', key: 'anamnese.notes', value: 'x' }))).toBe(true);
  });
  it('note vide → retirée', () => {
    const a = bilanReducer(e, { type: 'note', key: 'anamnese.notes', value: 'x' });
    expect(isDirty(bilanReducer(a, { type: 'note', key: 'anamnese.notes', value: '' }))).toBe(false);
  });
  it('reset → nouvel id et code, vide, même zone', () => {
    const a = bilanReducer(e, { type: 'note', key: 'anamnese.notes', value: 'x' });
    const s = bilanReducer(a, { type: 'reset' });
    expect(s.id).not.toBe(a.id);
    expect(s.zone).toBe('shoulder');
    expect(isDirty(s)).toBe(false);
  });
  it('identity → dirty', () => {
    const s = bilanReducer(e, { type: 'identity', field: 'nom', value: 'Dupont' });
    expect(s.identity.nom).toBe('Dupont');
    expect(isDirty(s)).toBe(true);
  });
  it('code B-xxxx et id', () => {
    expect(e.code).toMatch(/^B-\d{4}$/);
    expect(e.id).toBeTruthy();
  });
  it('load remplace l’état tel quel', () => {
    const other = { ...emptyBilan('shoulder'), notes: { 'a.notes': 'y' } };
    expect(bilanReducer(e, { type: 'load', bilan: other })).toBe(other);
  });
  it('immuable', () => {
    const before = JSON.stringify(e);
    bilanReducer(e, { type: 'chip', key: 'a.b.c', value: true });
    expect(JSON.stringify(e)).toBe(before);
  });
  it('updatedAt modifié par une saisie', () => {
    const s = bilanReducer(
      { ...e, updatedAt: '2000-01-01T00:00:00.000Z' },
      { type: 'note', key: 'x.notes', value: 'a' },
    );
    expect(s.updatedAt).not.toBe('2000-01-01T00:00:00.000Z');
  });
});
