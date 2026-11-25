import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Root from '../src/Root';
import { isPatientLocked, setPatientLocked, simulateRemoteLock } from '../src/bilan/patientGuard';
import BilanRoot from '../src/bilan/ui/BilanRoot';

const T = { timeout: 8000 };

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  location.hash = '#/bilan';
});
afterEach(async () => {
  setPatientLocked(false);
  // Le démontage enregistre la dernière saisie : laisser cette écriture finir avant que le test
  // suivant remplace la base IndexedDB simulée (sinon elle écrirait dans la nouvelle).
  cleanup();
  await new Promise((r) => setTimeout(r, 300));
});

const accueil = () => {
  const d = [...document.querySelectorAll<HTMLDetailsElement>('details.bilan-sec')][0]!;
  if (!d.open) fireEvent.click(d.querySelector('summary')!);
  return within(d);
};

/** Crée le PIN, ouvre un nouveau bilan au nom de Dupont, lance l'accueil patient. */
async function startPatient(ui: React.ReactElement = <BilanRoot />) {
  render(ui);
  fireEvent.change(await screen.findByLabelText('PIN (6 chiffres)', {}, T), { target: { value: '123456' } });
  fireEvent.change(screen.getByLabelText('Confirme le PIN'), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Créer le PIN' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Nouveau bilan' }, T));
  fireEvent.change(await screen.findByLabelText('Nom'), { target: { value: 'Dupont' } });
  fireEvent.click(accueil().getByRole('button', { name: 'Accueil patient' }));
  expect(screen.getByText(/Accès guidé/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Commencer l’accueil' }));
  await screen.findByRole('heading', { name: 'Où avez-vous mal ?' }, T);
}

async function physioExit(pin: string) {
  fireEvent.click(screen.getByRole('button', { name: 'Physio' }));
  fireEvent.change(screen.getByLabelText('PIN'), { target: { value: pin } });
  fireEvent.click(screen.getByRole('button', { name: 'Revenir au bilan' }));
}

describe('mode patient', () => {
  it('le patient ne voit que son accueil', async () => {
    await startPatient();
    expect(isPatientLocked()).toBe(true);
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/Mes bilans|Nouveau bilan|B-\d{4}|Dupont/);
    expect(screen.queryByRole('region', { name: 'Suggestions' })).toBeNull();
  }, 30000);

  it('trajet complet, PIN incorrect puis correct', async () => {
    await startPatient();
    fireEvent.click(screen.getByLabelText('L’épaule'));
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(screen.getByRole('heading', { name: 'Quelle épaule ?' })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Droite'));
    for (let k = 0; k < 20 && !screen.queryByRole('button', { name: 'Terminer' }); k++)
      fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));
    fireEvent.click(screen.getByRole('button', { name: 'Terminer' }));
    expect(screen.getByText('Merci, vous pouvez rendre la tablette.')).toBeInTheDocument();
    await physioExit('000000');
    expect(await screen.findByText('PIN incorrect', {}, T)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('PIN'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Revenir au bilan' }));
    expect(await screen.findByText('Statut : rempli par le patient', { exact: false }, T)).toBeInTheDocument();
    expect(isPatientLocked()).toBe(false);
    const a = accueil();
    expect(within(a.getByRole('group', { name: 'Zones douloureuses' })).getByLabelText('L’épaule')).toBeChecked();
    expect(a.queryByText(/^patient :/)).toBeNull();
    expect(screen.getByLabelText('Nom')).toHaveValue('Dupont');
  }, 30000);

  it('interruption : statut physio, réponse gardée comme réponse du patient', async () => {
    await startPatient();
    fireEvent.click(screen.getByLabelText('L’épaule'));
    await physioExit('123456');
    expect(await screen.findByText('Statut : rempli par le physio en séance', {}, T)).toBeInTheDocument();
    const zones = within(accueil().getByRole('group', { name: 'Zones douloureuses' }));
    expect(zones.getByLabelText('L’épaule')).toBeChecked();
    fireEvent.click(zones.getByLabelText('La nuque'));
    expect(accueil().getByText('patient : L’épaule')).toBeInTheDocument();
  }, 30000);

  it('body chart du patient : un seul crayon, sans gomme', async () => {
    await startPatient();
    for (let k = 0; k < 10 && !screen.queryByRole('heading', { name: 'Dessinez là où vous avez mal' }); k++)
      fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(screen.getByRole('img', { name: 'Body chart, vue de face' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Crayon' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Gomme' })).toBeNull();
  }, 30000);

  it('changer d’adresse ou revenir en arrière ne fait pas sortir', async () => {
    await startPatient(<Root />);
    act(() => {
      location.hash = '#/';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(screen.queryByRole('heading', { name: 'Bienvenue' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Où avez-vous mal ?' })).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(screen.getByRole('heading', { name: 'Où avez-vous mal ?' })).toBeInTheDocument();
  }, 30000);

  it('un autre onglet déverrouillé se verrouille', async () => {
    render(<BilanRoot />);
    fireEvent.change(await screen.findByLabelText('PIN (6 chiffres)', {}, T), { target: { value: '123456' } });
    fireEvent.change(screen.getByLabelText('Confirme le PIN'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Créer le PIN' }));
    await screen.findByRole('heading', { name: 'Mes bilans' }, T);
    act(() => simulateRemoteLock());
    expect(await screen.findByRole('button', { name: 'Déverrouiller' }, T)).toBeInTheDocument();
  }, 30000);
});
