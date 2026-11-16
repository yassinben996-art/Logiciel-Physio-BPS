import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from '../src/App';

const radial = () => within(document.querySelector('.radial') as HTMLElement);
const details = (id: number) => document.getElementById(`tr-${id}`) as HTMLDetailsElement;
const next = () => fireEvent.click(screen.getByRole('button', { name: /^(Suivant|Terminer)$/ }));
const toPro = () => fireEvent.click(screen.getByRole('button', { name: 'Espace physiothérapeute' }));
const goStep = (name: RegExp) =>
  fireEvent.click(within(screen.getByRole('navigation', { name: 'Étapes' })).getByRole('button', { name }));

describe('parcours patient', () => {
  it('accueil minimal, sans exemple', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Bienvenue' })).toBeInTheDocument();
    expect(screen.queryByText(/Marie|K\.A\.|P\.D\./)).toBeNull();
  });

  it('une question par écran ; la zone est obligatoire ; le parcours alimente le moteur', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Commencer' }));
    expect(screen.getByRole('heading', { name: 'Où avez-vous mal ?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Suivant' })).toBeDisabled();
    fireEvent.click(screen.getByLabelText('L’épaule'));
    next();
    fireEvent.click(screen.getByLabelText('Plus de 3 mois'));
    next();
    fireEvent.click(within(screen.getByRole('group', { name: /intensité/ })).getByLabelText('6'));
    next();
    // Attentes de récupération faibles → volet 5 allumé à l'épaule
    fireEvent.click(within(screen.getByRole('group', { name: /guérir/ })).getByLabelText('2'));
    next();
    next();
    fireEvent.click(screen.getByLabelText('Diabète'));
    next();
    fireEvent.click(screen.getByLabelText(/Travail physique/));
    next();
    // Questionnaires de l'épaule (version publique) : on les traverse sans répondre.
    const seen: string[] = [];
    let guard = 0;
    while (!screen.queryByRole('heading', { name: 'Votre objectif' }) && guard++ < 30) {
      seen.push(screen.getByRole('heading', { level: 1 }).textContent ?? '');
      next();
    }
    expect(seen.some((t) => t === 'QuickDASH')).toBe(true);
    expect(seen.some((t) => /SPADI/.test(t))).toBe(false); // désactivé par défaut
    expect(seen.some((t) => /TSK/.test(t))).toBe(true);
    expect(seen.some((t) => /FABQ/.test(t))).toBe(false); // lombaires seulement
    fireEvent.change(screen.getByLabelText('Votre objectif'), { target: { value: 'Peindre au plafond' } });
    next();
    expect(screen.getByRole('heading', { name: 'Merci !' })).toBeInTheDocument();
    toPro();
    goStep(/Plan de prise en charge/);
    expect(radial().getByRole('button', { name: /^Cognitivo-affectif : Présent/ })).toBeInTheDocument();
    expect(radial().getByRole('button', { name: /^Comorbidités : Présent/ })).toBeInTheDocument();
    expect(screen.getByText('« Peindre au plafond »')).toBeInTheDocument();
  });
});

describe('espace physio', () => {
  const openPlanWithExample = () => {
    render(<App />);
    toPro();
    // Saisie rapide d'un cas : cervical, marqueurs nociceptifs, ressenti, environnement
    fireEvent.click(screen.getByLabelText('Plus de 3 mois'));
    fireEvent.click(within(screen.getByRole('group', { name: 'Douleur moyenne' })).getByLabelText('6'));
    fireEvent.click(within(screen.getByRole('group', { name: /guérir/ })).getByLabelText('3'));
    fireEvent.click(within(screen.getByRole('group', { name: /capable/ })).getByLabelText('3'));
    fireEvent.click(screen.getByLabelText(/Peu de soutien/));
    fireEvent.click(screen.getByLabelText(/Peu d’activité/));
    goStep(/Examen clinique/);
    fireEvent.click(screen.getByLabelText(/La douleur varie avec les mouvements/));
    goStep(/Plan de prise en charge/);
  };

  it('les étapes se suivent et le plan affiche les volets par priorité', () => {
    openPlanWithExample();
    const ids = [...document.querySelectorAll('.tree details')].map((d) => d.id);
    expect(ids.slice(0, 3)).toEqual(['tr-5', 'tr-6', 'tr-1']);
    expect(details(5).open).toBe(true);
    expect(within(details(1)).queryByText(/6\/10 vers 4,8\/10/)).toBeInTheDocument();
  });

  it('un nœud du radial ou un volet de la barre latérale ouvre la bonne branche', () => {
    openPlanWithExample();
    fireEvent.keyDown(radial().getByRole('button', { name: /^Neuropathique : Sans signal/ }), {
      key: 'Enter',
    });
    expect(details(3).open).toBe(true);
    goStep(/Sécurité/);
    fireEvent.click(screen.getAllByRole('button', { name: /^Comorbidités : Sans signal/ })[0]!);
    expect(screen.getByRole('heading', { name: 'Plan de prise en charge' })).toBeInTheDocument();
    expect(details(4).open).toBe(true);
  });

  it('tout déplier / replier / masquer ; l’état survit aux changements', () => {
    openPlanWithExample();
    fireEvent.click(screen.getByRole('button', { name: 'Tout déplier' }));
    [1, 2, 3, 4, 5, 6].forEach((i) => expect(details(i).open).toBe(true));
    fireEvent.click(screen.getByRole('button', { name: 'Tout replier' }));
    fireEvent.click(screen.getByLabelText('Masquer les volets sans signal'));
    expect(details(2)).toBeNull();
    goStep(/Questionnaires/);
    fireEvent.change(screen.getByLabelText('Score (%)'), { target: { value: '40' } });
    goStep(/Plan de prise en charge/);
    expect(details(5).open).toBe(false);
  });

  it('drapeau rouge : alerte et pastille dans la navigation', () => {
    render(<App />);
    toPro();
    goStep(/Sécurité/);
    fireEvent.click(screen.getByLabelText(/Signes de myélopathie/));
    expect(screen.getByText('Drapeau rouge à traiter d’abord.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sécurité, 1 drapeau(x) rouge(s)' })).toBeInTheDocument();
  });

  it('questionnaires : valeur hors plage signalée et ignorée', () => {
    render(<App />);
    toPro();
    goStep(/Questionnaires/);
    fireEvent.change(screen.getByLabelText('Score (−1 à 38)'), { target: { value: '50' } });
    expect(screen.getByText(/Valeur hors plage/)).toBeInTheDocument();
  });

  it('copier le résumé', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    openPlanWithExample();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Copier le résumé' })));
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('PROFIL DES MOTEURS DE DOULEUR : CERVICALGIE'),
    );
    writeText.mockRejectedValueOnce(new Error('denied'));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Copier le résumé' })));
    expect(screen.getByText(/Copie refusée/)).toBeInTheDocument();
  });

  it('nouveau patient : confirmation dans la page puis retour à l’accueil', () => {
    render(<App />);
    toPro();
    fireEvent.click(screen.getByRole('button', { name: 'Nouveau patient' }));
    fireEvent.click(screen.getByRole('button', { name: 'Effacer' }));
    expect(screen.getByRole('heading', { name: 'Bienvenue' })).toBeInTheDocument();
  });

  it('n’utilise aucun stockage navigateur', () => {
    const set = vi.spyOn(Storage.prototype, 'setItem');
    openPlanWithExample();
    expect(set).not.toHaveBeenCalled();
  });
});
