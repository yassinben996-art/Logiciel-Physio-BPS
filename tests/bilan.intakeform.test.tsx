import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import IntakeForm from '../src/bilan/ui/IntakeForm';
import type { Intake } from '../src/bilan/state/intake';

describe('accueil rempli par le patient', () => {
  it('remplit douleur, durée, body chart, PSFS et dépistage puis « J’ai terminé »', async () => {
    const user = userEvent.setup();
    const onDone = vi.fn<(i: Intake) => void>();
    render(<IntakeForm zoneLabel="Genou" onDone={onDone} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Avant votre séance' })).toBeInTheDocument();
    await user.click(
      within(screen.getByRole('group', { name: /Votre douleur maintenant/ })).getByLabelText('6'),
    );
    await user.click(
      within(screen.getByRole('group', { name: /La douleur la plus forte/ })).getByLabelText('8'),
    );
    await user.click(screen.getByLabelText('Plus de 3 mois'));
    await user.click(screen.getByLabelText('Après un choc, une chute ou un accident'));
    await user.click(screen.getByRole('button', { name: 'Genou (devant), côté droit' }));
    await user.type(screen.getByLabelText('Activité 1'), 'descendre les escaliers');
    await user.selectOptions(screen.getByLabelText('Capacité pour l’activité 1 (0 à 10)'), '3');
    await user.click(within(screen.getByRole('group', { name: /sommeil/ })).getByLabelText('Oui'));
    await user.click(within(screen.getByRole('group', { name: /peur que bouger/ })).getByLabelText('Non'));
    await user.click(screen.getByRole('button', { name: 'J’ai terminé' }));
    const i = onDone.mock.calls[0]![0];
    expect(i).toMatchObject({
      painNow: 6,
      painWorst: 8,
      duration: 'gt3m',
      onset: 'trauma',
      regions: ['genou_d'],
      psfs: [{ activity: 'descendre les escaliers', score: 3 }],
      screening: { sommeil: true, peur: false },
    });
    expect(Number.isNaN(Date.parse(i.completedAt))).toBe(false);
  });
  it('aucune réponse obligatoire', async () => {
    const user = userEvent.setup();
    const onDone = vi.fn<(i: Intake) => void>();
    render(<IntakeForm zoneLabel="Épaule" onDone={onDone} />);
    await user.click(screen.getByRole('button', { name: 'J’ai terminé' }));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone.mock.calls[0]![0].psfs).toEqual([]);
  });
  it('reprend des réponses déjà données', () => {
    render(
      <IntakeForm
        zoneLabel="Épaule"
        initial={{
          painNow: 4,
          painWorst: null,
          duration: null,
          onset: null,
          regions: ['epaule_d'],
          psfs: [],
          screening: {},
          completedAt: '',
        }}
        onDone={() => {}}
      />,
    );
    expect(
      within(screen.getByRole('group', { name: /Votre douleur maintenant/ })).getByLabelText('4'),
    ).toBeChecked();
    expect(screen.getByRole('button', { name: 'Épaule, côté droit' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
