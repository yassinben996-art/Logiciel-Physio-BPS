import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { KNEE } from '../src/bilan/content';
import { sysmetaBlocks } from '../src/bilan/engine/exports';
import { emptyBilan } from '../src/bilan/state/bilan';
import { emptyIntake, type Intake } from '../src/bilan/state/intake';
import BodyChart from '../src/bilan/ui/BodyChart';
import Handback from '../src/bilan/ui/Handback';
import IntakeForm from '../src/bilan/ui/IntakeForm';

describe('corrections de la relecture', () => {
  it('Handback : sans enregistrement confirmé, pas de « réponses enregistrées »', () => {
    render(<Handback saved={false} onResume={async () => {}} />);
    expect(screen.queryByText(/sont enregistrées/)).not.toBeInTheDocument();
    expect(screen.getByText('Vous pouvez rendre la tablette à votre physiothérapeute.')).toBeInTheDocument();
  });
  it('Handback : enregistrement confirmé', () => {
    render(<Handback saved onResume={async () => {}} />);
    expect(screen.getByText(/Vos réponses sont enregistrées/)).toBeInTheDocument();
  });
  it('accueil : chaque réponse est transmise comme brouillon (non terminé)', async () => {
    const user = userEvent.setup();
    const onDraft = vi.fn<(i: Intake) => void>();
    render(<IntakeForm zoneLabel="Genou" onDone={() => {}} onDraft={onDraft} />);
    await user.click(screen.getByRole('button', { name: 'Bas du dos' }));
    const last = onDraft.mock.calls.at(-1)![0];
    expect(last.regions).toEqual(['bas_dos']);
    expect(last.completedAt).toBe('');
  });
  it('accueil : la note PSFS est désactivée tant que l’activité est vide', async () => {
    const user = userEvent.setup();
    render(<IntakeForm zoneLabel="Genou" onDone={() => {}} />);
    const sel = screen.getByLabelText('Capacité pour l’activité 1 (0 à 10)');
    expect(sel).toBeDisabled();
    await user.type(screen.getByLabelText('Activité 1'), 'courir');
    expect(sel).toBeEnabled();
  });
  it('accueil : « J’ai terminé » ne s’envoie qu’une fois', async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<IntakeForm zoneLabel="Genou" onDone={onDone} />);
    const b = screen.getByRole('button', { name: 'J’ai terminé' });
    await user.click(b);
    await user.click(b);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(b).toBeDisabled();
  });
  it('body chart : bascule face / dos pour les petits écrans', async () => {
    const user = userEvent.setup();
    render(<BodyChart selected={[]} onToggle={() => {}} />);
    const dos = screen.getByRole('button', { name: 'Voir de dos' });
    expect(screen.getByRole('button', { name: 'Voir de face' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(dos);
    expect(dos).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('group', { name: 'De dos' })).toHaveClass('active');
  });
  it('SYSmeta : avec un accueil, le bloc Anamnèse vient en premier', () => {
    const s = {
      ...emptyBilan('knee'),
      nums: { 'mobilite.flex_a.D': 120 },
      intake: { ...emptyIntake(), painNow: 5, completedAt: 'x' },
    };
    expect(sysmetaBlocks(KNEE, s)[0]!.rubric).toBe('Anamnèse');
  });
});

describe('accueil non terminé', () => {
  it('le résumé indique « non terminé »', async () => {
    const { default: IntakeSummary } = await import('../src/bilan/ui/IntakeSummary');
    render(<IntakeSummary intake={{ ...emptyIntake(), painNow: 3 }} />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Accueil rempli par le patient · non terminé');
  });
});
