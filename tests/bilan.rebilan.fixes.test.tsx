// Corrections de la relecture finale (rebilan).
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SHOULDER } from '../src/bilan/content';
import { evolutionRows } from '../src/bilan/engine/evolution';
import { emptyBilan, makeRebilan, type BilanState } from '../src/bilan/state/bilan';
import { completeMeta, type BilanMeta } from '../src/bilan/storage/vault';
import BilanApp from '../src/bilan/ui/BilanApp';

const at = (b: BilanState, day: string, nums: Record<string, number> = {}): BilanState => ({
  ...b,
  createdAt: `${day}T10:00:00.000Z`,
  nums,
});
const b1 = at(emptyBilan('shoulder'), '2026-09-01', { 'mobilite.flex_a.D': 100 });
const b2 = at(makeRebilan(b1), '2026-10-01', { 'mobilite.flex_a.D': 120 });
const b3 = at(makeRebilan(b2), '2026-11-01', { 'mobilite.flex_a.D': 150 });

describe('I1 : fiches enregistrées avant le rebilan', () => {
  it('complétées à la lecture : patient, création, échéance', () => {
    const old: BilanMeta = {
      id: b1.id,
      code: b1.code,
      label: 'X',
      zone: 'shoulder',
      updatedAt: '2026-09-02T00:00:00.000Z',
    };
    const m = completeMeta(old, {
      ...b1,
      patientId: undefined,
      followUp: undefined,
    } as unknown as BilanState);
    expect(m).toMatchObject({
      id: b1.id,
      label: 'X',
      updatedAt: '2026-09-02T00:00:00.000Z',
      patientId: b1.id,
      createdAt: b1.createdAt,
      due: '2026-09-29',
      closed: false,
    });
    // Fiche déjà complète : inchangée.
    const full = { ...old, createdAt: 'c', due: 'd', patientId: 'p', closed: false };
    expect(completeMeta(full, b1)).toBe(full);
  });
});

describe('I2 : l’évolution s’arrête au bilan affiché', () => {
  it('premier bilan : pas d’évolution, même si des rebilans existent', () => {
    render(<BilanApp initial={b1} series={[b1, b2, b3]} onChange={vi.fn()} />);
    expect(screen.queryByRole('region', { name: 'Évolution' })).not.toBeInTheDocument();
  });
  it('rebilan n° 2 : colonnes 1 et 2 seulement', () => {
    render(<BilanApp initial={b2} series={[b1, b2, b3]} onChange={vi.fn()} />);
    const evo = within(screen.getByRole('region', { name: 'Évolution' }));
    expect(evo.getByText('01.09.2026')).toBeInTheDocument();
    expect(evo.getByText('01.10.2026')).toBeInTheDocument();
    expect(evo.queryByText('01.11.2026')).not.toBeInTheDocument();
    expect(evo.getByText('+20°')).toBeInTheDocument();
  });
});

describe('écart seulement si le dernier bilan a la valeur', () => {
  it('dernière colonne vide → pas d’écart', () => {
    const last = at(makeRebilan(b2), '2026-11-01');
    const rows = evolutionRows(SHOULDER, [b1, b2, last]);
    const r = rows.find((x) => x.label === 'Flexion active D')!;
    expect(r.values).toEqual(['100°', '120°', null]);
    expect(r.delta).toBeUndefined();
  });
});
