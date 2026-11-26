import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryStore } from '../relay/src/memoryStore';
import BilanRoot from '../src/bilan/ui/BilanRoot';
import { BASE, ENV, fetchFor } from './relay.helpers';

const relay = vi.hoisted(() => ({ url: '' }));
vi.mock('../src/bilan/sync/config', () => ({
  get RELAY_URL() {
    return relay.url;
  },
}));

const T = { timeout: 10000 };
let store: MemoryStore;

beforeEach(() => {
  store = new MemoryStore();
  globalThis.fetch = fetchFor(store);
  globalThis.indexedDB = new IDBFactory();
  relay.url = BASE;
  location.hash = '#/bilan';
});
afterEach(async () => {
  cleanup();
  await new Promise((r) => setTimeout(r, 300));
});

async function createPin(pin = '123456') {
  fireEvent.change(await screen.findByLabelText('PIN (6 chiffres)', {}, T), { target: { value: pin } });
  fireEvent.change(screen.getByLabelText('Confirme le PIN'), { target: { value: pin } });
  fireEvent.click(screen.getByRole('button', { name: 'Créer le PIN' }));
}
const syncSection = () => within(screen.getByRole('region', { name: 'Synchronisation' }));

async function activate() {
  render(<BilanRoot />);
  await createPin();
  await screen.findByRole('heading', { name: 'Mes bilans' }, T);
  fireEvent.click(await syncSection().findByRole('button', { name: 'Activer la synchronisation' }, T));
  fireEvent.change(syncSection().getByLabelText('Code d’installation'), {
    target: { value: ENV.RELAY_SETUP_CODE },
  });
  fireEvent.change(syncSection().getByLabelText('Nom de cet appareil'), { target: { value: 'Tablette' } });
  fireEvent.click(syncSection().getByRole('button', { name: 'Activer' }));
  await syncSection().findByText('Synchronisé', {}, T);
}

describe('écrans de synchronisation', () => {
  it('relais pas encore installé', async () => {
    relay.url = '';
    render(<BilanRoot />);
    await createPin();
    expect(await screen.findByText(/pas encore installée/, {}, T)).toBeInTheDocument();
  }, 30000);

  it('activation : mauvais code, puis bon code', async () => {
    render(<BilanRoot />);
    await createPin();
    await screen.findByRole('heading', { name: 'Mes bilans' }, T);
    fireEvent.click(await syncSection().findByRole('button', { name: 'Activer la synchronisation' }, T));
    fireEvent.change(syncSection().getByLabelText('Code d’installation'), { target: { value: 'faux' } });
    fireEvent.change(syncSection().getByLabelText('Nom de cet appareil'), { target: { value: 'Tablette' } });
    fireEvent.click(syncSection().getByRole('button', { name: 'Activer' }));
    expect(await syncSection().findByText('Code d’installation incorrect', {}, T)).toBeInTheDocument();
    fireEvent.change(syncSection().getByLabelText('Code d’installation'), {
      target: { value: ENV.RELAY_SETUP_CODE },
    });
    fireEvent.click(syncSection().getByRole('button', { name: 'Activer' }));
    expect(await syncSection().findByText('Synchronisé', {}, T)).toBeInTheDocument();
  }, 30000);

  it('ajouter un appareil, le relier par le lien, retrouver le bilan, retirer l’appareil', async () => {
    await activate();
    fireEvent.click(screen.getByRole('button', { name: 'Nouveau bilan' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Épaule' }, T));
    fireEvent.change(await screen.findByLabelText('Nom', { exact: true }), { target: { value: 'Dupont' } });
    await screen.findByText('Enregistré', {}, T);
    fireEvent.click(screen.getByRole('button', { name: 'Mes bilans' }));
    await screen.findByRole('heading', { name: 'Mes bilans' }, T);
    await syncSection().findByText('Synchronisé', {}, T);
    fireEvent.click(syncSection().getByRole('button', { name: 'Ajouter un appareil' }));
    const qr = await syncSection().findByRole('img', { name: 'QR code d’appairage' }, T);
    expect(qr.querySelectorAll('rect').length).toBeGreaterThan(50);
    const code = syncSection().getByTestId('pairing-code').textContent!;
    expect(code).toMatch(/^([0-9A-Z]{4}-){16}[0-9A-Z]{4}$/);
    expect(syncSection().getByText('Valable 10 minutes, une seule fois.')).toBeInTheDocument();
    cleanup();

    // Deuxième appareil : il ouvre le lien du QR code.
    globalThis.indexedDB = new IDBFactory();
    location.hash = `#/bilan/relier?c=${code}`;
    render(<BilanRoot />);
    expect(location.hash).toBe('#/bilan');
    await createPin('654321');
    fireEvent.change(await screen.findByLabelText('Nom de cet appareil', {}, T), {
      target: { value: 'Téléphone' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Relier' }));
    const list = await screen.findByRole('list', { name: 'Bilans enregistrés' }, T);
    expect(await within(list).findByText('Dupont', {}, T)).toBeInTheDocument();

    // Mes appareils : deux appareils ; on retire la tablette.
    fireEvent.click(await syncSection().findByRole('button', { name: 'Mes appareils' }, T));
    const devices = await syncSection().findByRole('list', { name: 'Appareils reliés' }, T);
    expect(within(devices).getAllByRole('listitem')).toHaveLength(2);
    expect(within(devices).getByText(/cet appareil/)).toBeInTheDocument();
    fireEvent.click(within(devices).getByRole('button', { name: 'Retirer Tablette' }));
    fireEvent.click(within(devices).getByRole('button', { name: 'Confirmer le retrait' }));
    await vi.waitFor(() => expect(within(devices).getAllByRole('listitem')).toHaveLength(1), T);
  }, 60000);

  it('code mal tapé dans « Relier à mes autres appareils »', async () => {
    render(<BilanRoot />);
    await createPin();
    await screen.findByRole('heading', { name: 'Mes bilans' }, T);
    fireEvent.click(await syncSection().findByRole('button', { name: 'Relier à mes autres appareils' }, T));
    fireEvent.change(syncSection().getByLabelText('Code d’appairage'), { target: { value: 'ABCD-EFGH' } });
    fireEvent.change(syncSection().getByLabelText('Nom de cet appareil'), { target: { value: 'Ordi' } });
    fireEvent.click(syncSection().getByRole('button', { name: 'Relier' }));
    expect(await syncSection().findByText('Code incorrect : vérifie la saisie', {}, T)).toBeInTheDocument();
  }, 30000);

  it('une copie en conflit est signalée dans la liste', async () => {
    const { createVault } = await import('../src/bilan/storage/vault');
    const { emptyBilan } = await import('../src/bilan/state/bilan');
    const v = await createVault('123456');
    const b = { ...emptyBilan('shoulder'), identity: { nom: 'Martin', prenom: '', naissance: '' } };
    await v.save(b);
    await v.keepAsConflictCopy(b.id, '2026-11-25T14:03:00.000Z');
    render(<BilanRoot />);
    fireEvent.change(await screen.findByLabelText('PIN', {}, T), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Déverrouiller' }));
    const list = await screen.findByRole('list', { name: 'Bilans enregistrés' }, T);
    expect(within(list).getByText(/copie en conflit, du 25\.11 à \d\d:03/)).toBeInTheDocument();
  }, 30000);
});
