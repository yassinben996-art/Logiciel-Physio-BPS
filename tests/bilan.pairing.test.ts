import { codeFromHash, decodePairing, encodePairing, pairingLink } from '../src/bilan/sync/pairing';

const p = {
  ticket: Uint8Array.from([1, 2, 3, 4, 250, 251, 252, 253]),
  key: Uint8Array.from({ length: 32 }, (_, i) => (i * 37 + 11) % 256),
};

describe('code d’appairage', () => {
  it('aller-retour et format', () => {
    const c = encodePairing(p);
    expect(c).toMatch(/^([0-9A-Z]{4}-){16}[0-9A-Z]{4}$/);
    expect(c).not.toMatch(/[ILOU]/);
    const d = decodePairing(c);
    expect([...d.ticket]).toEqual([...p.ticket]);
    expect([...d.key]).toEqual([...p.key]);
  });
  it('tolère minuscules, espaces, O/0 et I/L/1', () => {
    const c = encodePairing(p);
    const messy = c.toLowerCase().replace(/-/g, ' ').replace(/0/g, 'o').replace(/1/g, 'l');
    expect([...decodePairing(messy).key]).toEqual([...p.key]);
  });
  it('une lettre fausse → message clair', () => {
    const c = encodePairing(p);
    const i = c.indexOf('-') + 1;
    const wrong = c.slice(0, i) + (c[i] === 'A' ? 'B' : 'A') + c.slice(i + 1);
    expect(() => decodePairing(wrong)).toThrow('Code incorrect : vérifie la saisie');
    expect(() => decodePairing('ABCD')).toThrow('Code incorrect : vérifie la saisie');
    expect(() => decodePairing('')).toThrow('Code incorrect : vérifie la saisie');
  });
  it('lien et lecture du hash', () => {
    const c = encodePairing(p);
    const link = pairingLink(c, 'https://yassinben996-art.github.io/Logiciel-Physio-BPS/');
    expect(link).toBe(`https://yassinben996-art.github.io/Logiciel-Physio-BPS/#/bilan/relier?c=${c}`);
    expect(codeFromHash(`#/bilan/relier?c=${c}`)).toBe(c);
    expect(codeFromHash('#/bilan')).toBeNull();
    expect(codeFromHash('#/bilan/relier')).toBeNull();
  });
});
