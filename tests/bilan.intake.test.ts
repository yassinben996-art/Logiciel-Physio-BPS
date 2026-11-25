import { describe, expect, it } from 'vitest';
import { BODY_REGIONS } from '../src/bilan/content/body';
import { SCREENING } from '../src/bilan/content/intake';
import { bilanReducer, emptyBilan, isDirty } from '../src/bilan/state/bilan';
import { emptyIntake, sanitizeIntake } from '../src/bilan/state/intake';

const now = '2026-11-25T10:00:00.000Z';

describe('accueil : nettoyage des réponses', () => {
  it('douleur hors 0–10 ou non entière → null', () => {
    const i = sanitizeIntake({ ...emptyIntake(), painNow: 11, painWorst: 3.5 });
    expect(i.painNow).toBeNull();
    expect(i.painWorst).toBeNull();
  });
  it('douleur valide conservée', () =>
    expect(sanitizeIntake({ ...emptyIntake(), painNow: 0 }).painNow).toBe(0));
  it('zones inconnues ou en double retirées', () => {
    const id = BODY_REGIONS[0]!.id;
    expect(sanitizeIntake({ ...emptyIntake(), regions: [id, id, 'inconnue'] }).regions).toEqual([id]);
  });
  it('PSFS : 3 activités au plus, texte nettoyé, score 0–10 ou null', () => {
    const i = sanitizeIntake({
      ...emptyIntake(),
      psfs: [
        { activity: '  porter un sac ', score: 4 },
        { activity: 'courir', score: 12 },
        { activity: '', score: 5 },
        { activity: 'jardiner', score: 2 },
        { activity: 'nager', score: 1 },
      ],
    });
    expect(i.psfs).toEqual([
      { activity: 'porter un sac', score: 4 },
      { activity: 'courir', score: null },
      { activity: 'jardiner', score: 2 },
    ]);
  });
  it('dépistage : questions inconnues retirées', () => {
    const known = SCREENING[0]!.id;
    expect(sanitizeIntake({ ...emptyIntake(), screening: { [known]: true, autre: true } }).screening).toEqual(
      {
        [known]: true,
      },
    );
  });
  it('durée et début inconnus → null', () => {
    const i = sanitizeIntake({ ...emptyIntake(), duration: 'xx' as never, onset: 'yy' as never });
    expect(i.duration).toBeNull();
    expect(i.onset).toBeNull();
  });
});

describe('accueil : reducer', () => {
  it('action intake enregistre la version nettoyée et rend le bilan modifié', () => {
    const s = bilanReducer(emptyBilan('knee'), {
      type: 'intake',
      intake: { ...emptyIntake(), painNow: 6, regions: ['inconnue'], completedAt: now },
    });
    expect(s.intake?.painNow).toBe(6);
    expect(s.intake?.regions).toEqual([]);
    expect(s.intake?.completedAt).toBe(now);
    expect(isDirty(s)).toBe(true);
  });
  it('un bilan sans accueil reste valide', () => expect(emptyBilan('shoulder').intake).toBeUndefined());
});
