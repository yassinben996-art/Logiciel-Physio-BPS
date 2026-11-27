import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { emptyBilan, makeRebilan, type BilanState } from '../src/bilan/state/bilan';
import type { BilanMeta } from '../src/bilan/storage/vault';
import BilanApp from '../src/bilan/ui/BilanApp';
import BilanList from '../src/bilan/ui/BilanList';
import { today } from '../src/bilan/engine/followup';

const b1: BilanState = {
  ...emptyBilan('shoulder'),
  createdAt: '2026-10-01T10:00:00.000Z',
  nums: { 'mobilite.flex_a.D': 120 },
};
const b2: BilanState = {
  ...makeRebilan(b1),
  createdAt: '2026-11-01T10:00:00.000Z',
  nums: { 'mobilite.flex_a.D': 150 },
};

describe('rebilan : écran du bilan', () => {
  it('« Rebilan n° 2 », valeurs d’avant à la demande, évolution', () => {
    const { container } = render(<BilanApp initial={b2} series={[b1, b2]} onChange={vi.fn()} />);
    expect(screen.getByText(/Rebilan n° 2/)).toBeInTheDocument();
    expect(screen.queryByText('avant : D 120°')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Afficher le bilan précédent' }));
    expect(screen.getByText('avant : D 120°')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Masquer le bilan précédent' })).toBeInTheDocument();
    const evo = within(screen.getByRole('region', { name: 'Évolution' }));
    expect(evo.getByText('Flexion active D')).toBeInTheDocument();
    expect(evo.getByText('+30°')).toBeInTheDocument();
    expect(evo.getByText('01.10.2026')).toBeInTheDocument();
    void container;
  });
  it('premier bilan : pas d’évolution ni de bilan précédent ; bouton Rebilan', () => {
    const onRebilan = vi.fn();
    render(<BilanApp initial={b1} series={[b1]} onChange={vi.fn()} onRebilan={onRebilan} />);
    expect(screen.queryByRole('region', { name: 'Évolution' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Afficher le bilan précédent' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Rebilan' }));
    expect(onRebilan).toHaveBeenCalledOnce();
  });
  it('suivi : prochaine date, délai, report à la main, fin de prise en charge', () => {
    const onChange = vi.fn();
    render(<BilanApp initial={b1} series={[b1]} onChange={onChange} />);
    const date = screen.getByLabelText('Prochain rebilan le') as HTMLInputElement;
    expect(date.value).toBe('2026-10-29');
    fireEvent.change(date, { target: { value: '2026-11-15' } });
    expect(onChange.mock.lastCall![0].followUp.due).toBe('2026-11-15');
    fireEvent.change(screen.getByLabelText('Délai'), { target: { value: '2' } });
    expect(onChange.mock.lastCall![0].followUp).toEqual({ weeks: 2, due: null, closed: false });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Fin de prise en charge' }));
    expect(onChange.mock.lastCall![0].followUp.closed).toBe(true);
  });
});

describe('Mes bilans : onglet « À rebilanter »', () => {
  const base = { code: 'B-1', zone: 'shoulder', updatedAt: 'x', closed: false };
  const late = (d: number) => {
    const t = new Date(`${today()}T12:00:00Z`);
    t.setUTCDate(t.getUTCDate() - d);
    return t.toISOString().slice(0, 10);
  };
  const items: BilanMeta[] = [
    { ...base, id: 'a', label: 'Alice', patientId: 'a', createdAt: '2026-09-01T10:00:00.000Z', due: late(5) },
    {
      ...base,
      id: 'b',
      label: 'Bob',
      patientId: 'b',
      createdAt: '2026-09-01T10:00:00.000Z',
      due: '2999-01-01',
    },
  ];
  it('liste, retard, Rebilan, Ouvrir, Repousser', () => {
    const onRebilan = vi.fn();
    const onPostpone = vi.fn();
    const onOpen = vi.fn();
    render(
      <BilanList
        items={items}
        onOpen={onOpen}
        onNew={vi.fn()}
        onRemove={vi.fn()}
        onLock={vi.fn()}
        onRebilan={onRebilan}
        onPostpone={onPostpone}
      />,
    );
    fireEvent.click(screen.getByRole('tab', { name: 'À rebilanter (1)' }));
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
    expect(screen.getByText(/en retard de 5 jours/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Rebilan Alice' }));
    expect(onRebilan).toHaveBeenCalledWith('a');
    fireEvent.click(screen.getByRole('button', { name: 'Repousser Alice' }));
    fireEvent.click(screen.getByRole('button', { name: '+1 semaine' }));
    expect(onPostpone).toHaveBeenCalledWith('a', 7);
    fireEvent.click(screen.getByRole('button', { name: 'Repousser Alice' }));
    fireEvent.click(screen.getByRole('button', { name: '+2 semaines' }));
    expect(onPostpone).toHaveBeenCalledWith('a', 14);
    fireEvent.click(screen.getByRole('tab', { name: 'Tous les bilans' }));
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });
});
