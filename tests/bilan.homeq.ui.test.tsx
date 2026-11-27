import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SHOULDER } from '../src/bilan/content';
import { evaluate } from '../src/bilan/engine/rules';
import { emptyBilan, type BilanState, type HomeRequest } from '../src/bilan/state/bilan';
import BilanList from '../src/bilan/ui/BilanList';
import HomeQPanel from '../src/bilan/ui/HomeQPanel';

const KEY = 'k'.repeat(43);
const request = (ids: string[]): HomeRequest => ({
  ticket: 'TICKET',
  hash: 'h'.repeat(64),
  key: KEY,
  ids,
  createdAt: '2026-11-27T10:00:00.000Z',
  expiresAt: '2099-12-11T10:00:00.000Z',
});
const panel = (s: BilanState, homeQ: Parameters<typeof HomeQPanel>[0]['homeQ'], dispatch = vi.fn()) =>
  render(
    <HomeQPanel
      zone={SHOULDER}
      state={s}
      dispatch={dispatch}
      suggestions={evaluate(SHOULDER, s)}
      homeQ={homeQ}
      base="https://site.test/app/"
    />,
  );

describe('questionnaires à domicile : écran de Yass', () => {
  it('sans synchronisation : explication', () => {
    panel(emptyBilan('shoulder'), null);
    expect(
      screen.getByText('Active la synchronisation pour envoyer des questionnaires au patient.'),
    ).toBeInTheDocument();
  });
  it('propositions pré-cochées, cocher plus, créer le QR code', async () => {
    const dispatch = vi.fn();
    const create = vi.fn(async (ids: readonly string[]) => request([...ids]));
    panel(emptyBilan('shoulder'), { create }, dispatch);
    expect(screen.getByRole('checkbox', { name: /SPADI/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /QuickDASH/ })).toBeChecked();
    const tsk = screen.getByRole('checkbox', { name: /TSK/ });
    expect(tsk).not.toBeChecked();
    fireEvent.click(tsk);
    fireEvent.click(screen.getByRole('button', { name: 'Créer le QR code' }));
    await waitFor(() => expect(create).toHaveBeenCalledWith(['quickdash', 'spadi', 'tsk'], undefined));
    await waitFor(() =>
      expect(dispatch).toHaveBeenCalledWith({
        type: 'homeQCreate',
        req: request(['quickdash', 'spadi', 'tsk']),
      }),
    );
  });
  it('demande en attente : QR, lien, copie, date limite, nouvel envoi', () => {
    const s = { ...emptyBilan('shoulder'), homeQ: request(['spadi']) };
    panel(s, { create: vi.fn() });
    expect(screen.getByText('En attente des réponses du patient')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'QR code des questionnaires' })).toBeInTheDocument();
    expect(
      screen.getByText(
        `https://site.test/app/#/q?t=TICKET&k=${KEY}&q=spadi&e=${Date.parse('2099-12-11T10:00:00.000Z') / 1000}`,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copier le lien' })).toBeInTheDocument();
    expect(screen.getByText(/valable jusqu’au 11\.12\.2099/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Nouvel envoi' }));
    expect(screen.getByRole('button', { name: 'Créer le QR code' })).toBeInTheDocument();
  });
  it('lien expiré sans réponse', () => {
    const s = {
      ...emptyBilan('shoulder'),
      homeQ: { ...request(['spadi']), expiresAt: '2020-01-01T00:00:00.000Z' },
    };
    panel(s, { create: vi.fn() });
    expect(screen.getByText('Le lien a expiré sans réponse.')).toBeInTheDocument();
  });
  it('réponses reçues : nom, score, date', () => {
    const answers = Object.fromEntries(Array.from({ length: 11 }, (_, i) => [`qd${i + 1}`, 3]));
    const s = {
      ...emptyBilan('shoulder'),
      qResults: { quickdash: { answers, at: '2026-11-28T09:00:00.000Z' } },
    };
    panel(s, { create: vi.fn() });
    expect(screen.getByRole('heading', { name: 'Réponses du patient' })).toBeInTheDocument();
    const list = within(screen.getByRole('list'));
    expect(list.getByText('QuickDASH')).toBeInTheDocument();
    expect(list.getByText(/50 \/ 100/)).toBeInTheDocument();
    expect(list.getByText(/reçu le 28\.11\.2026/)).toBeInTheDocument();
    // nouvel envoi à la demande ; déjà reçu : plus pré-coché
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Nouvel envoi' }));
    expect(screen.getByRole('checkbox', { name: /QuickDASH/ })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /SPADI/ })).toBeChecked();
  });
});

describe('Mes bilans : pastilles', () => {
  it('reçu / en attente', () => {
    const base = { code: 'B-1', zone: 'shoulder', updatedAt: '2026-11-27T10:00:00.000Z' };
    render(
      <BilanList
        items={[
          { ...base, id: 'a', label: 'A', qStatus: 'received' },
          { ...base, id: 'b', label: 'B', qStatus: 'pending' },
        ]}
        onOpen={vi.fn()}
        onNew={vi.fn()}
        onRemove={vi.fn()}
        onLock={vi.fn()}
      />,
    );
    expect(screen.getByText('réponses reçues')).toBeInTheDocument();
    expect(screen.getByText('questionnaires en attente')).toBeInTheDocument();
  });
});
