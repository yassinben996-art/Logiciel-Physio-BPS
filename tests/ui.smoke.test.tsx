import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from '../src/App';

const details = (id: number) => document.getElementById(`tr-${id}`) as HTMLDetailsElement;

describe('application', () => {
  it('démarre sur l’exemple cervical avec le bandeau non validé', () => {
    render(<App />);
    expect(screen.getByLabelText('Repère du patient')).toHaveValue('M.B.');
    expect(screen.getByText('Nuque : contenu validé par Delphi (Gérard 2025)')).toBeInTheDocument();
    expect(screen.getAllByText(/non validée/).length).toBeGreaterThan(1);
    // Ordre de l'arbre = ordre de priorité 5,1,6,4,2,3
    const ids = [...document.querySelectorAll('.tree details')].map((d) => d.id);
    expect(ids).toEqual(['tr-5', 'tr-1', 'tr-6', 'tr-4', 'tr-2', 'tr-3']);
    // 2 premiers prioritaires ouverts par défaut
    expect(details(5).open).toBe(true);
    expect(details(1).open).toBe(true);
    expect(details(6).open).toBe(false);
  });

  it('un nœud du radial ouvre la bonne branche (clic et clavier)', () => {
    render(<App />);
    const node = screen.getByRole('button', { name: /^Environnement et mode de vie : Présent/ });
    fireEvent.click(node);
    expect(details(6).open).toBe(true);
    const node3 = screen.getByRole('button', { name: /^Neuropathique : Sans signal/ });
    fireEvent.keyDown(node3, { key: 'Enter' });
    expect(details(3).open).toBe(true);
  });

  it('tout déplier / tout replier / masquer les vides ; l’état survit aux changements', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Tout déplier' }));
    [1, 2, 3, 4, 5, 6].forEach((i) => expect(details(i).open).toBe(true));
    fireEvent.click(screen.getByRole('button', { name: 'Tout replier' }));
    [1, 2, 3, 4, 5, 6].forEach((i) => expect(details(i).open).toBe(false));
    fireEvent.click(screen.getByLabelText('Masquer les volets sans signal'));
    expect(details(2)).toBeNull();
    expect(details(3)).toBeNull();
    // Changement de formulaire : les branches restent repliées.
    fireEvent.change(screen.getByLabelText('Douleur moyenne (0–10)'), { target: { value: '4' } });
    expect(details(5).open).toBe(false);
    // Cliquer un volet masqué le ré-affiche et l'ouvre.
    fireEvent.click(screen.getByRole('button', { name: /^Nociplastique : Sans signal/ }));
    expect(details(2).open).toBe(true);
  });

  it('cibles chiffrées, preuve et références visibles dans une branche allumée', () => {
    render(<App />);
    const b1 = within(details(1));
    expect(b1.getByText(/6\/10 vers 4,8\/10 ou moins/)).toBeInTheDocument();
    expect(b1.getAllByText('Guideline').length).toBeGreaterThan(0);
    expect(b1.getAllByRole('link', { name: /Référence \d+/ }).length).toBeGreaterThan(0);
  });

  it('changer de région met à jour modèle, drapeaux, instruments et décoche les cases régionales', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Épaule/, pressed: false }));
    expect(screen.getByText('Épaule : adaptation non validée du modèle')).toBeInTheDocument();
    expect(screen.getByLabelText('Instrument d’incapacité')).toHaveValue('SPADI');
    expect(screen.getByText(/arthrite septique possible/)).toBeInTheDocument();
    // a_mech (cervical) supprimé → volet 1 éteint
    expect(screen.getByRole('button', { name: /^Nociceptif : Sans signal/ })).toBeInTheDocument();
  });

  it('drapeau rouge urgent : alerte répétée dans le plan', () => {
    render(<App />);
    fireEvent.click(screen.getByLabelText(/Signes de myélopathie ou déficit neurologique/));
    expect(screen.getAllByText('Drapeau rouge à traiter d’abord.')).toHaveLength(2);
  });

  it('valeur hors plage signalée et ignorée', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Score painDETECT (−1 à 38)'), { target: { value: '50' } });
    expect(screen.getByText(/Valeur hors plage/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Neuropathique : Sans signal/ })).toBeInTheDocument();
  });

  it('copier le résumé : succès puis refus gérés', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<App />);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Copier le résumé' })));
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('PROFIL DES MOTEURS DE DOULEUR : CERVICALGIE'),
    );
    expect(screen.getByText('Résumé copié dans le presse-papiers.')).toBeInTheDocument();
    writeText.mockRejectedValueOnce(new Error('denied'));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Copier le résumé' })));
    expect(screen.getByText(/Copie refusée/)).toBeInTheDocument();
  });

  it('réinitialiser vide le formulaire', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Réinitialiser' }));
    expect(screen.getByLabelText('Repère du patient')).toHaveValue('');
    expect(screen.getByText(/Aucun volet allumé/)).toBeInTheDocument();
  });

  it('n’utilise aucun stockage navigateur', () => {
    const set = vi.spyOn(Storage.prototype, 'setItem');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /K\.A\., lombalgie/ }));
    expect(set).not.toHaveBeenCalled();
  });
});
