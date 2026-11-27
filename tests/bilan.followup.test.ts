import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import { dueList, nextDue, postpone } from '../src/bilan/engine/followup';
import {
  bilanReducer,
  emptyBilan,
  makeRebilan,
  normalizeBilan,
  type BilanState,
} from '../src/bilan/state/bilan';
import { createVault, type BilanMeta } from '../src/bilan/storage/vault';

describe('série et rebilan', () => {
  it('ancien bilan normalisé', () => {
    const { patientId: _p, previousId: _q, followUp: _f, ...old } = emptyBilan('shoulder');
    void _p;
    void _q;
    void _f;
    const n = normalizeBilan(old);
    expect(n.patientId).toBe(n.id);
    expect(n.previousId).toBeNull();
    expect(n.followUp).toEqual({ weeks: 4, due: null, closed: false });
  });
  it('nouveau bilan : patient = lui-même', () => {
    const b = emptyBilan('knee');
    expect(b.patientId).toBe(b.id);
  });
  it('rebilan : identité, zone et délai repris ; mesures vides ; fin de prise en charge non reprise', () => {
    let prev: BilanState = {
      ...emptyBilan('knee'),
      identity: { nom: 'Dupont', prenom: 'Marie', naissance: '1980-03-05' },
      nums: { 'mob.flex.D': 120 },
      notes: { 'anamnese.notes': 'x' },
      qResults: { tsk: { answers: { a: 1 }, at: 'x' } },
    };
    prev = bilanReducer(prev, { type: 'followUp', weeks: 2 });
    prev = bilanReducer(prev, { type: 'followUp', closed: true });
    const r = makeRebilan(prev);
    expect(r.id).not.toBe(prev.id);
    expect(r.code).not.toBe('');
    expect(r.patientId).toBe(prev.patientId);
    expect(r.previousId).toBe(prev.id);
    expect(r.zone).toBe('knee');
    expect(r.identity).toEqual(prev.identity);
    expect(r.followUp).toEqual({ weeks: 2, due: null, closed: false });
    expect(r.nums).toEqual({});
    expect(r.notes).toEqual({});
    expect(r.qResults).toEqual({});
  });
  it('suivi : changer le délai efface la date choisie', () => {
    let s = bilanReducer(emptyBilan('shoulder'), { type: 'followUp', due: '2027-01-15' });
    expect(s.followUp.due).toBe('2027-01-15');
    s = bilanReducer(s, { type: 'followUp', weeks: 6 });
    expect(s.followUp).toEqual({ weeks: 6, due: null, closed: false });
  });
});

describe('échéances', () => {
  it('date choisie, sinon création + semaines (heure de Lausanne)', () => {
    expect(nextDue('2026-11-27T10:00:00.000Z', { weeks: 4, due: null, closed: false })).toBe('2026-12-25');
    expect(nextDue('2026-11-27T23:30:00.000Z', { weeks: 1, due: null, closed: false })).toBe('2026-12-05');
    expect(nextDue('2026-11-27T10:00:00.000Z', { weeks: 4, due: '2027-01-02', closed: false })).toBe(
      '2027-01-02',
    );
    expect(postpone('2026-11-27', 7)).toBe('2026-12-04');
    expect(postpone('2026-12-28', 14)).toBe('2027-01-11');
  });
  const meta = (p: Partial<BilanMeta> & Pick<BilanMeta, 'id'>): BilanMeta => ({
    code: 'B-1',
    label: p.id,
    zone: 'shoulder',
    updatedAt: 'x',
    createdAt: '2026-10-01T10:00:00.000Z',
    patientId: p.id,
    due: '2026-10-29',
    closed: false,
    ...p,
  });
  it('dernier bilan de chaque patient, sans copies ni clos, trié par retard', () => {
    const list = dueList(
      [
        meta({ id: 'a1', patientId: 'A', createdAt: '2026-09-01T10:00:00.000Z', due: '2026-09-29' }),
        meta({ id: 'a2', patientId: 'A', createdAt: '2026-11-20T10:00:00.000Z', due: '2026-12-18' }), // pas encore
        meta({ id: 'b1', patientId: 'B', due: '2026-11-22' }),
        meta({ id: 'c1', patientId: 'C', due: '2026-11-01' }),
        meta({
          id: 'c2',
          patientId: 'C',
          createdAt: '2026-11-25T10:00:00.000Z',
          due: '2026-11-02',
          conflictOf: 'c1',
          conflictAt: 'x',
        }),
        meta({ id: 'd1', patientId: 'D', due: '2026-11-01', closed: true }),
        meta({ id: 'e1', patientId: 'E', due: '2026-11-27' }), // aujourd'hui : dû
      ],
      '2026-11-27',
    );
    expect(list.map((x) => [x.meta.id, x.late])).toEqual([
      ['c1', 26],
      ['b1', 5],
      ['e1', 0],
    ]);
  });
});

describe('fiche', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
  });
  it('patient, création, échéance, fin de prise en charge, précédent', async () => {
    const v = await createVault('123456');
    const b = { ...emptyBilan('shoulder'), createdAt: '2026-11-27T10:00:00.000Z' };
    await v.save(b);
    const r = { ...makeRebilan(b), createdAt: '2026-12-20T10:00:00.000Z' };
    await v.save(r);
    const m = (await v.list()).find((x) => x.id === r.id)!;
    expect(m).toMatchObject({
      patientId: b.id,
      previousId: b.id,
      createdAt: r.createdAt,
      due: '2027-01-17',
      closed: false,
    });
  });
});
