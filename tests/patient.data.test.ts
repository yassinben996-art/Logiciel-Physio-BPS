import { describe, expect, it } from 'vitest';
import { P_HEALTH, P_LIFE } from '../src/data/patient';
import { D4, D6 } from '../src/data/items';

describe('formulations patient', () => {
  it('couvrent exactement les items du moteur', () => {
    expect(Object.keys(P_HEALTH).sort()).toEqual(D4.map((i) => i.id).sort());
    expect(Object.keys(P_LIFE).sort()).toEqual(D6.map((i) => i.id).sort());
  });
});
