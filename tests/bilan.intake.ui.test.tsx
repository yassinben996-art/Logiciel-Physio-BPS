import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { emptyBilan, type BilanState } from '../src/bilan/state/bilan';
import BilanApp from '../src/bilan/ui/BilanApp';

const openAccueil = (container: HTMLElement) => {
  const d = [...container.querySelectorAll<HTMLDetailsElement>('details.bilan-sec')][0]!;
  expect(d.querySelector('.bilan-sec-title')).toHaveTextContent('Accueil');
  fireEvent.click(d.querySelector('summary')!);
  return within(d);
};
const withIntake = (p: Partial<BilanState['intake']>): BilanState => {
  const e = emptyBilan('shoulder');
  return { ...e, intake: { ...e.intake, ...p } };
};

describe('section Accueil (physio)', () => {
  it('premier onglet, statut, Passer', () => {
    const { container } = render(<BilanApp />);
    const a = openAccueil(container);
    expect(a.getByText('Statut : non fait')).toBeInTheDocument();
    fireEvent.click(a.getByRole('button', { name: 'Passer l’accueil' }));
    expect(a.getByText('Statut : rempli par le physio en séance')).toBeInTheDocument();
    expect(a.queryByRole('button', { name: 'Passer l’accueil' })).toBeNull();
  });
  it('« Accueil patient » seulement si onStartPatient est fourni', () => {
    const { container, unmount } = render(<BilanApp />);
    expect(openAccueil(container).queryByRole('button', { name: 'Accueil patient' })).toBeNull();
    unmount();
    const r = render(<BilanApp onStartPatient={() => {}} />);
    expect(openAccueil(r.container).getByRole('button', { name: 'Accueil patient' })).toBeInTheDocument();
  });
  it('saisie du physio : statut passe à « physio », suggestion CSI', () => {
    const { container } = render(<BilanApp />);
    const a = openAccueil(container);
    fireEvent.click(within(a.getByRole('group', { name: 'Durée' })).getByLabelText('Plus de 3 mois'));
    expect(a.getByText('Statut : rempli par le physio en séance')).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Suggestions' })).getByText(
        'Inventaire de sensibilisation centrale (CSI)',
      ),
    ).toBeInTheDocument();
  });
  it('Côté seulement si l’épaule est cochée', () => {
    const { container } = render(<BilanApp />);
    const a = openAccueil(container);
    expect(a.queryByRole('group', { name: 'Côté' })).toBeNull();
    fireEvent.click(within(a.getByRole('group', { name: 'Zones douloureuses' })).getByLabelText('L’épaule'));
    expect(a.getByRole('group', { name: 'Côté' })).toBeInTheDocument();
  });
  it('réponse corrigée : « patient : 7 »', () => {
    const { container } = render(
      <BilanApp
        initial={withIntake({
          status: 'patient',
          answers: { douleur_actuelle: 5 },
          original: { douleur_actuelle: 7 },
        })}
      />,
    );
    expect(openAccueil(container).getByText('patient : 7')).toBeInTheDocument();
  });
  it('zone du bilan non cochée par le patient : avertissement', () => {
    const { container } = render(<BilanApp initial={withIntake({ answers: { zones: ['cervical'] } })} />);
    expect(openAccueil(container).getByText('Le patient n’a pas coché Épaule')).toBeInTheDocument();
  });
  it('body chart avec plusieurs crayons côté physio', () => {
    const { container } = render(<BilanApp />);
    const a = openAccueil(container);
    expect(a.getByRole('group', { name: 'Crayon' })).toBeInTheDocument();
    expect(a.getByRole('button', { name: 'Gomme' })).toBeInTheDocument();
  });
  it('Côté aussi pour le genou', () => {
    const { container } = render(<BilanApp initial={emptyBilan('knee')} />);
    const a = openAccueil(container);
    fireEvent.click(within(a.getByRole('group', { name: 'Zones douloureuses' })).getByLabelText('Le genou'));
    expect(a.getByRole('group', { name: 'Côté' })).toBeInTheDocument();
  });
});
