import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newHomeKey, openAnswers } from '../src/bilan/homeq/link';
import type { Box } from '../src/bilan/storage/crypto';
import { RelayError } from '../src/bilan/sync/api';
import PatientHomeQ from '../src/bilan/ui/PatientHomeQ';
import { PCS, TSK } from '../src/questionnaires/public';

const KEY = newHomeKey();
const HASH = `#/q?t=TICKET1&k=${KEY}&q=tsk,pcs`;

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

const start = async (submit = vi.fn<(t: string, b: Box) => Promise<void>>(async () => {})) => {
  render(<PatientHomeQ hash={HASH} relayUrl="https://relais.test" submit={submit} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Commencer' }));
  return submit;
};
const next = () => fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));
const pagesTotal = TSK.pages.length + PCS.pages.length;

describe('page du patient', () => {
  it('lien mal formé', () => {
    render(<PatientHomeQ hash="#/q?t=x" relayUrl="https://relais.test" />);
    expect(screen.getByText('Ce lien n’est pas valable.')).toBeInTheDocument();
  });
  it('accueil sans nom ni score, progression, envoi chiffré', async () => {
    render(<PatientHomeQ hash={HASH} relayUrl="https://relais.test" submit={vi.fn()} />);
    expect(
      await screen.findByRole('heading', { name: 'Questionnaires de votre physiothérapeute' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/2 questionnaires/)).toBeInTheDocument();
    cleanup();
    const submit = await start();
    expect(screen.getByText(/Questionnaire 1 sur 2/)).toBeInTheDocument();
    // Première réponse de la TSK : 1re option.
    const first = TSK.pages[0]!.items[0]!;
    fireEvent.click(
      screen.getAllByRole('radio', { name: (TSK.pages[0]!.options ?? first.options)![0]!.label })[0]!,
    );
    for (let i = 0; i < pagesTotal; i++) next();
    expect(screen.getByText(/Il manque \d+ réponses/)).toBeInTheDocument();
    expect(screen.queryByText(/\/ 68|score/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer à mon physiothérapeute' }));
    await screen.findByText('Merci, c’est envoyé. Vous pouvez fermer cette page.');
    expect(submit).toHaveBeenCalledOnce();
    const [ticket, box] = submit.mock.calls[0]!;
    expect(ticket).toBe('TICKET1');
    const a = await openAnswers(KEY, box);
    expect(a.tsk![first.id]).toBe((TSK.pages[0]!.options ?? first.options)![0]!.value);
  });
  it('lien expiré ou déjà utilisé ; hors connexion puis réessai', async () => {
    const submit = vi.fn<(t: string, b: Box) => Promise<void>>(async () => {
      throw new RelayError(410, 'x');
    });
    await start(submit);
    for (let i = 0; i < pagesTotal; i++) next();
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer à mon physiothérapeute' }));
    expect(
      await screen.findByText('Ce lien n’est plus valable. Demandez-en un nouveau à votre physiothérapeute.'),
    ).toBeInTheDocument();
    cleanup();
    const flaky = vi
      .fn<(t: string, b: Box) => Promise<void>>(async () => {})
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await start(flaky);
    for (let i = 0; i < pagesTotal; i++) next();
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer à mon physiothérapeute' }));
    expect(await screen.findByText(/Pas de connexion/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    await screen.findByText('Merci, c’est envoyé. Vous pouvez fermer cette page.');
  });
  it('brouillon gardé ; après l’envoi, « déjà envoyé »', async () => {
    await start();
    const opt = TSK.pages[0]!.options![1]!.label;
    fireEvent.click(screen.getAllByRole('radio', { name: opt })[0]!);
    await new Promise((r) => setTimeout(r, 50));
    cleanup();
    await start();
    await waitFor(() => expect(screen.getAllByRole('radio', { name: opt })[0]).toBeChecked());
    for (let i = 0; i < pagesTotal; i++) next();
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer à mon physiothérapeute' }));
    await screen.findByText('Merci, c’est envoyé. Vous pouvez fermer cette page.');
    cleanup();
    render(<PatientHomeQ hash={HASH} relayUrl="https://relais.test" submit={vi.fn()} />);
    expect(await screen.findByText('Vos réponses ont déjà été envoyées. Merci !')).toBeInTheDocument();
  });
});
