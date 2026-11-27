import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import { SHOULDER } from '../src/bilan/content';
import { evaluate } from '../src/bilan/engine/rules';
import {
  HOMEQ_DAYS,
  homeLink,
  newHomeKey,
  openAnswers,
  parseHomeLink,
  sealAnswers,
  ticketHash,
} from '../src/bilan/homeq/link';
import { proposeHomeQuestionnaires } from '../src/bilan/homeq/propose';
import {
  bilanReducer,
  emptyBilan,
  normalizeBilan,
  type BilanState,
  type HomeRequest,
} from '../src/bilan/state/bilan';
import { createVault } from '../src/bilan/storage/vault';

const req = async (ids: string[], ticket = 'AAAAAAAAAAAAAAAAAAAAAA'): Promise<HomeRequest> => ({
  ticket,
  hash: await ticketHash(ticket),
  key: newHomeKey(),
  ids,
  createdAt: '2026-11-27T10:00:00.000Z',
  expiresAt: '2099-12-11T10:00:00.000Z',
});

describe('lien des questionnaires à domicile', () => {
  it('aller-retour ; ids inconnus retirés ; lien incomplet refusé', () => {
    const key = newHomeKey();
    expect(key).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const url = homeLink('https://x.github.io/app/', { ticket: 'tk', key, ids: ['spadi', 'tsk'] });
    expect(url).toBe(`https://x.github.io/app/#/q?t=tk&k=${key}&q=spadi,tsk`);
    expect(parseHomeLink(`#/q?t=tk&k=${key}&q=spadi,inconnu,tsk`)).toEqual({
      ticket: 'tk',
      key,
      ids: ['spadi', 'tsk'],
    });
    expect(parseHomeLink(`#/q?k=${key}&q=spadi`)).toBeNull();
    expect(parseHomeLink('#/q?t=tk&q=spadi')).toBeNull();
    expect(parseHomeLink('#/q?t=tk&k=abc&q=spadi')).toBeNull(); // clé de mauvaise taille
    expect(parseHomeLink(`#/q?t=tk&k=${key}&q=inconnu`)).toBeNull(); // aucun questionnaire
    expect(parseHomeLink('#/bilan')).toBeNull();
    expect(HOMEQ_DAYS).toBe(14);
  });
  it('chiffrement : la bonne clé ouvre, une autre échoue', async () => {
    const key = newHomeKey();
    const a = { spadi: { spadi1: 5, 'spadi1#': 5 } };
    const box = await sealAnswers(key, a);
    expect(await openAnswers(key, box)).toEqual(a);
    await expect(openAnswers(newHomeKey(), box)).rejects.toThrow();
    expect(await ticketHash('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});

describe('état du bilan', () => {
  it('demande puis réception ; autre empreinte ignorée ; un nouvel envoi garde l’ancien', async () => {
    const r1 = await req(['tsk']);
    let s = bilanReducer(emptyBilan('shoulder'), { type: 'homeQCreate', req: r1 });
    expect(s.homeQ).toEqual(r1);
    const other = bilanReducer(s, {
      type: 'homeQReceived',
      hash: 'zz',
      answers: { tsk: { t1: 1 } },
      at: 'x',
    });
    expect(other).toBe(s);
    s = bilanReducer(s, {
      type: 'homeQReceived',
      hash: r1.hash,
      answers: { tsk: { t1: 1 } },
      at: '2026-11-28',
    });
    expect(s.homeQ).toBeNull();
    expect(s.qResults.tsk).toEqual({ answers: { t1: 1 }, at: '2026-11-28' });
    const r2 = await req(['spadi'], 'BBBBBBBBBBBBBBBBBBBBBB');
    s = bilanReducer(s, { type: 'homeQCreate', req: r2 });
    s = bilanReducer(s, {
      type: 'homeQReceived',
      hash: r2.hash,
      answers: { spadi: { s1: 3 } },
      at: '2026-11-29',
    });
    expect(Object.keys(s.qResults).sort()).toEqual(['spadi', 'tsk']);
  });
  it('ancien bilan normalisé', () => {
    const { homeQ: _h, qResults: _q, ...old } = emptyBilan('shoulder');
    void _h;
    void _q;
    const n = normalizeBilan(old);
    expect(n.homeQ).toBeNull();
    expect(n.qResults).toEqual({});
  });
});

describe('propositions', () => {
  it('épaule : défauts de la zone ; règles déclenchées ; déjà reçus exclus', () => {
    const s = emptyBilan('shoulder');
    expect(proposeHomeQuestionnaires(SHOULDER, s, evaluate(SHOULDER, s))).toEqual(['quickdash', 'spadi']);
    const peur: BilanState = { ...s, chips: { 'drapeaux.jaunes.peur_mvt': true } };
    expect(proposeHomeQuestionnaires(SHOULDER, peur, evaluate(SHOULDER, peur))).toContain('tsk');
    const recu: BilanState = { ...s, qResults: { spadi: { answers: {}, at: 'x' } } };
    expect(proposeHomeQuestionnaires(SHOULDER, recu, evaluate(SHOULDER, recu))).toEqual(['quickdash']);
  });
});

describe('fiche de « Mes bilans »', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
  });
  it('en attente, puis reçu', async () => {
    const v = await createVault('123456');
    const r = await req(['tsk']);
    let s = bilanReducer(emptyBilan('shoulder'), { type: 'homeQCreate', req: r });
    await v.save(s);
    expect((await v.list())[0]).toMatchObject({ homeQHash: r.hash, qStatus: 'pending' });
    s = bilanReducer(s, { type: 'homeQReceived', hash: r.hash, answers: { tsk: {} }, at: 'x' });
    await v.save(s);
    const m = (await v.list())[0]!;
    expect(m.qStatus).toBe('received');
    expect(m.homeQHash).toBeUndefined();
  });
});
