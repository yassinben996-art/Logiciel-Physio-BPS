import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import BodyChart from '../src/bilan/ui/BodyChart';

function Harness() {
  const [sel, setSel] = useState<readonly string[]>([]);
  return (
    <>
      <BodyChart
        selected={sel}
        onToggle={(id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))}
      />
      <output data-testid="sel">{sel.join(',')}</output>
    </>
  );
}

describe('body chart', () => {
  it('deux vues, face et dos', () => {
    render(<Harness />);
    expect(screen.getByRole('group', { name: 'De face' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'De dos' })).toBeInTheDocument();
  });
  it('toucher une zone la sélectionne puis la désélectionne', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const knee = screen.getByRole('button', { name: 'Genou (devant) droit(e)' });
    expect(knee).toHaveAttribute('aria-pressed', 'false');
    await user.click(knee);
    expect(knee).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('sel')).toHaveTextContent('genou_d');
    await user.click(knee);
    expect(screen.getByTestId('sel')).toHaveTextContent('');
  });
  it('clavier : Entrée sélectionne', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    screen.getByRole('button', { name: 'Bas du dos' }).focus();
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('sel')).toHaveTextContent('bas_dos');
  });
  it('lecture seule : aucune zone cliquable, liste des zones en texte', () => {
    render(<BodyChart selected={['genou_d', 'bas_dos']} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.getByText('Zones : Genou (devant) droit(e), Bas du dos')).toBeInTheDocument();
  });
});
