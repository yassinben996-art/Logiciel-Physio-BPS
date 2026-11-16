import { describe, expect, it } from 'vitest';
import { initialState, reducer } from '../src/state/reducer';

describe('reducer', () => {
  it('démarre sur l’exemple cervical', () => {
    expect(initialState().c.label).toBe('M.B.');
  });
  it('l’état des branches survit aux changements de formulaire', () => {
    let s = reducer(initialState(), { type: 'open', id: 3, value: true });
    s = reducer(s, { type: 'check', id: 'co_cv', value: true });
    s = reducer(s, { type: 'num', field: 'pain', value: 4 });
    s = reducer(s, { type: 'region', region: 'lumbar' });
    expect(s.open[3]).toBe(true);
  });
  it('charger un exemple ou réinitialiser remet l’état des branches par défaut', () => {
    const s = reducer(initialState(), { type: 'open', id: 3, value: true });
    expect(reducer(s, { type: 'example', region: 'shoulder' }).open).toEqual({});
    const r = reducer(s, { type: 'reset' });
    expect(r.open).toEqual({});
    expect(r.c.chk).toEqual({});
    expect(r.c.region).toBe('cervical');
  });
  it('décocher supprime la clé', () => {
    const s = reducer(initialState(), { type: 'check', id: 'a_mech', value: false });
    expect('a_mech' in s.c.chk).toBe(false);
  });
});
