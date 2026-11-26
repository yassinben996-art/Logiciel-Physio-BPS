import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Suggestion } from '../src/bilan/engine/rules';
import SuggestionsPanel from '../src/bilan/ui/SuggestionsPanel';

const sug = {
  ruleId: 'r',
  kind: 'test',
  target: 'tests.neer',
  label: 'Test de Neer',
  reason: 'raison',
  source: { label: 's', provisional: true },
} as unknown as Suggestion;

describe('panneau de suggestions sur petit écran', () => {
  it('vide : replié, pour ne pas cacher la saisie', () => {
    render(<SuggestionsPanel suggestions={[]} questionnaires={[]} dispatch={() => {}} />);
    expect(screen.getByRole('button', { name: 'Déplier' })).toHaveAttribute('aria-expanded', 'false');
  });
  it('avec des suggestions : ouvert ; le choix de Yass est respecté', () => {
    const { rerender } = render(
      <SuggestionsPanel suggestions={[sug]} questionnaires={[]} dispatch={() => {}} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Replier' }));
    rerender(
      <SuggestionsPanel
        suggestions={[sug, { ...sug, ruleId: 'r2' }]}
        questionnaires={[]}
        dispatch={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Déplier' })).toBeInTheDocument();
  });
});
