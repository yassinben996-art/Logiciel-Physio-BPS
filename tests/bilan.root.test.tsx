import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BilanRoot from '../src/bilan/ui/BilanRoot';

const WARNING =
  'Si tu oublies ce PIN, tes bilans seront perdus : ils sont chiffrés et personne ne peut les récupérer.';
const T = { timeout: 8000 };

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});
afterEach(() => vi.useRealTimers());

async function createPin() {
  render(<BilanRoot />);
  expect(await screen.findByText(WARNING, {}, T)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('PIN (6 chiffres)'), { target: { value: '123456' } });
  fireEvent.change(screen.getByLabelText('Confirme le PIN'), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Créer le PIN' }));
  await screen.findByRole('heading', { name: 'Mes bilans' }, T);
}

describe('BilanRoot', () => {
  it('premier lancement : création du PIN avec l’avertissement exact', async () => {
    render(<BilanRoot />);
    expect(await screen.findByText(WARNING, {}, T)).toBeInTheDocument();
  });

  it('PIN mal confirmé ou trop court : message, pas de coffre', async () => {
    render(<BilanRoot />);
    await screen.findByText(WARNING, {}, T);
    fireEvent.change(screen.getByLabelText('PIN (6 chiffres)'), { target: { value: '12345' } });
    fireEvent.change(screen.getByLabelText('Confirme le PIN'), { target: { value: '12345' } });
    fireEvent.click(screen.getByRole('button', { name: 'Créer le PIN' }));
    expect(await screen.findByText('Le PIN doit comporter exactement 6 chiffres.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('PIN (6 chiffres)'), { target: { value: '123456' } });
    fireEvent.change(screen.getByLabelText('Confirme le PIN'), { target: { value: '123457' } });
    fireEvent.click(screen.getByRole('button', { name: 'Créer le PIN' }));
    expect(await screen.findByText('Les deux PIN ne correspondent pas.')).toBeInTheDocument();
  });

  it('création, nouveau bilan, enregistrement, puis rechargement et déverrouillage', async () => {
    await createPin();
    expect(screen.getByText('Aucun bilan enregistré.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Nouveau bilan' }));
    const notes = await screen.findByRole('textbox', { name: 'Notes (Anamnèse)' });

    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'], shouldAdvanceTime: true });
    fireEvent.change(screen.getByLabelText('Prénom'), { target: { value: 'Marie' } });
    fireEvent.change(notes, { target: { value: 'fourmillements la nuit' } });
    expect(screen.getByRole('status')).toHaveTextContent('Enregistrement…');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    vi.useRealTimers();
    expect(await screen.findByText('Enregistré', {}, T)).toBeInTheDocument();
  }, 30000);

  it('après rechargement : PIN incorrect, puis bon PIN, bilan retrouvé', async () => {
    await createPin();
    fireEvent.click(screen.getByRole('button', { name: 'Nouveau bilan' }));
    fireEvent.change(await screen.findByLabelText('Nom'), { target: { value: 'Dupont' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Notes (Anamnèse)' }), {
      target: { value: 'fourmillements la nuit' },
    });
    await screen.findByText('Enregistré', {}, T);

    // Rechargement de la page : on démonte et on remonte.
    cleanup();
    render(<BilanRoot />);
    fireEvent.change(await screen.findByLabelText('PIN', {}, T), { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Déverrouiller' }));
    expect(await screen.findByText('PIN incorrect', {}, T)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('PIN'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Déverrouiller' }));
    const list = await screen.findByRole('list', { name: 'Bilans enregistrés' }, T);
    expect(within(list).getByText('Dupont')).toBeInTheDocument();
    fireEvent.click(within(list).getByRole('button', { name: /^Ouvrir/ }));
    expect(await screen.findByRole('textbox', { name: 'Notes (Anamnèse)' })).toHaveValue(
      'fourmillements la nuit',
    );
    expect(screen.getByLabelText('Nom')).toHaveValue('Dupont');
  }, 30000);

  it('recherche et suppression avec confirmation', async () => {
    await createPin();
    fireEvent.click(screen.getByRole('button', { name: 'Nouveau bilan' }));
    fireEvent.change(await screen.findByLabelText('Nom'), { target: { value: 'Dupont' } });
    await screen.findByText('Enregistré', {}, T);
    fireEvent.click(screen.getByRole('button', { name: 'Mes bilans' }));
    const list = await screen.findByRole('list', { name: 'Bilans enregistrés' });
    fireEvent.change(screen.getByLabelText('Rechercher'), { target: { value: 'martin' } });
    expect(within(list).queryByText('Dupont')).toBeNull();
    fireEvent.change(screen.getByLabelText('Rechercher'), { target: { value: 'dup' } });
    fireEvent.click(within(list).getByRole('button', { name: /^Supprimer/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer la suppression' }));
    expect(await screen.findByText('Aucun bilan enregistré.')).toBeInTheDocument();
  }, 30000);

  it('Verrouiller ramène à l’écran du PIN', async () => {
    await createPin();
    fireEvent.click(screen.getByRole('button', { name: 'Verrouiller' }));
    expect(await screen.findByRole('button', { name: 'Déverrouiller' })).toBeInTheDocument();
  }, 30000);
});
