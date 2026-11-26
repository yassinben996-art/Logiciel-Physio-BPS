import { SHOULDER } from '../src/bilan/content';
import { INTAKE } from '../src/bilan/content/intake';
import { scrub } from '../src/bilan/ai/scrub';
import { buildSummary, medicalDictionary } from '../src/bilan/ai/summary';
import { emptyBilan, type BilanState } from '../src/bilan/state/bilan';

const dictionary = medicalDictionary([SHOULDER], INTAKE);
const ctx = { names: ['Bensaid', 'Yassine'], dictionary };

describe('nettoyage des textes libres', () => {
  it('nom, date, lieu, téléphone, e-mail', () =>
    expect(scrub('Vu Yassine Bensaïd le 12.03.2024 à Lausanne, tél 079 123 45 67, yass@x.ch', ctx)).toBe(
      'Vu [nom] [nom] le [date] à [lieu], tél [téléphone], [e-mail]',
    ));
  it('insensible à la casse et aux accents', () => {
    const out = scrub('yassine dit que BENSAÏD est fatigué', ctx);
    expect(out.toLowerCase()).not.toContain('yassine');
    expect(out.toLowerCase()).not.toContain('bensa');
  });
  it('noms de tests cliniques gardés', () => {
    const t = 'Test de Neer positif, Hawkins-Kennedy négatif, Jobe douloureux. Douleur nocturne.';
    expect(scrub(t, ctx)).toBe(t);
  });
  it('adresse', () =>
    expect(scrub('Il habite chemin des Roses 4, au calme', ctx)).toBe('Il habite [lieu], au calme'));
  it('dates écrites', () => {
    const out = scrub('Lundi 12 mars, rendez-vous', ctx);
    expect(out).toContain('[date]');
    expect(out).not.toMatch(/Lundi|12 mars/);
  });
  it('autre nom propre en milieu de phrase', () =>
    expect(scrub('Adressé par le docteur Martin pour sa douleur', ctx)).toBe(
      'Adressé par le docteur [nom] pour sa douleur',
    ));
});

describe('résumé envoyé à l’IA', () => {
  const b = (): BilanState => {
    const e = emptyBilan('shoulder');
    return {
      ...e,
      code: 'B-1234',
      identity: { nom: 'Dupont', prenom: 'Marie', naissance: '1980-03-05' },
      notes: { 'anamnese.notes': 'Marie a mal depuis le 3 mars' },
      intake: {
        ...e.intake,
        status: 'physio',
        answers: { psfs: [{ activity: 'porter Dupont junior', score: 4 }] },
      },
    };
  };
  it('aucune identité, aucun code, aucun id', () => {
    const s = b();
    const out = buildSummary(SHOULDER, s, INTAKE);
    expect(out).not.toMatch(/Dupont|Marie|B-1234|1980/);
    expect(out).not.toContain(s.id);
    expect(out).toContain('[nom] a mal depuis le [date]');
    expect(out.split('\n')[0]).toBe('Zone : Épaule');
    expect(out).not.toContain('Accueil : rempli');
  });
  it('bilan vide', () =>
    expect(buildSummary(SHOULDER, emptyBilan('shoulder'), INTAKE)).toBe('Zone : Épaule'));
});
