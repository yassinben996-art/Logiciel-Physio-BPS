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
    fireEvent.click(await screen.findByRole('button', { name: 'Épaule' }));
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
    fireEvent.click(await screen.findByRole('button', { name: 'Épaule' }));
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
    fireEvent.click(await screen.findByRole('button', { name: 'Épaule' }));
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

  it('app en arrière-plan : enregistrement immédiat, sans attendre 500 ms', async () => {
    await createPin();
    fireEvent.click(screen.getByRole('button', { name: 'Nouveau bilan' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Épaule' }));
    const notes = await screen.findByRole('textbox', { name: 'Notes (Anamnèse)' });
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    fireEvent.change(notes, { target: { value: 'x' } });
    expect(screen.getByRole('status')).toHaveTextContent('Enregistrement…');
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    // Le délai de 500 ms ne peut pas s'écouler (setTimeout simulé) : seul l'enregistrement immédiat peut aboutir.
    // (findByText ne fonctionne pas avec un setTimeout simulé : on attend par setImmediate.)
    for (let k = 0; k < 200 && screen.getByRole('status').textContent !== 'Enregistré'; k++)
      await act(() => new Promise<void>((r) => setImmediate(r)));
    expect(screen.getByRole('status')).toHaveTextContent('Enregistré');
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  }, 30000);

  it('sauvegarde en échec : Verrouiller refuse et garde l’erreur visible', async () => {
    await createPin();
    fireEvent.click(screen.getByRole('button', { name: 'Nouveau bilan' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Épaule' }));
    const notes = await screen.findByRole('textbox', { name: 'Notes (Anamnèse)' });
    const put = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
      throw new DOMException('Quota dépassé', 'QuotaExceededError');
    });
    fireEvent.change(notes, { target: { value: 'saisie importante' } });
    expect(await screen.findByText('Échec de l’enregistrement', {}, T)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Verrouiller' }));
    expect(await screen.findByText(/n’est pas enregistrée/, {}, T)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Déverrouiller' })).toBeNull();
    expect(notes).toHaveValue('saisie importante');
    put.mockRestore();
    fireEvent.click(screen.getByRole('button', { name: 'Verrouiller' }));
    expect(await screen.findByRole('button', { name: 'Déverrouiller' }, T)).toBeInTheDocument();
  }, 30000);

  it('« Nouveau bilan » propose la zone : Genou ouvre le bilan du genou', async () => {
    await createPin();
    fireEvent.click(screen.getByRole('button', { name: 'Nouveau bilan' }));
    expect(await screen.findByRole('heading', { name: 'Nouveau bilan' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Genou' }));
    expect(await screen.findByText('Bilan · Genou')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Lachman' })).toBeInTheDocument();
  }, 30000);

  it('choix de zone : « Annuler » revient à la liste', async () => {
    await createPin();
    fireEvent.click(screen.getByRole('button', { name: 'Nouveau bilan' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Annuler' }));
    expect(await screen.findByRole('heading', { name: 'Mes bilans' })).toBeInTheDocument();
  }, 30000);

  it('accueil patient : remplissage, PIN pour reprendre, réponses visibles dans le bilan', async () => {
    await createPin();
    fireEvent.click(screen.getByRole('button', { name: 'Nouveau bilan' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Genou' }));
    fireEvent.change(await screen.findByLabelText('Nom'), { target: { value: 'Dupont' } });
    fireEvent.click(screen.getByRole('button', { name: 'Accueil patient' }));
    expect(await screen.findByRole('heading', { name: 'Avant votre séance' }, T)).toBeInTheDocument();
    expect(screen.queryByText('Dupont')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('Dupont')).not.toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('group', { name: /Votre douleur maintenant/ })).getByLabelText('6'));
    fireEvent.click(screen.getByRole('button', { name: 'Genou (devant), côté droit' }));
    fireEvent.click(screen.getByRole('button', { name: 'J’ai terminé' }));
    expect(await screen.findByRole('heading', { name: 'Merci !' }, T)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('PIN du physiothérapeute'), { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reprendre le bilan' }));
    expect(await screen.findByText('PIN incorrect', {}, T)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('PIN du physiothérapeute'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reprendre le bilan' }));
    const summary = await screen.findByRole('region', { name: 'Accueil rempli par le patient' }, T);
    expect(summary).toHaveTextContent('Douleur maintenant : 6/10');
    expect(summary).toHaveTextContent('Genou (devant), côté droit');
    expect(screen.getByLabelText('Nom')).toHaveValue('Dupont');
  }, 30000);
});
