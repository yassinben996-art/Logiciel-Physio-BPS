import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BilanApp from '../src/bilan/ui/BilanApp';

const suggestions = () => within(screen.getByRole('region', { name: 'Suggestions' }));
const notes = (section: string) => screen.getByRole('textbox', { name: `Notes (${section})` });
const writeText = vi.fn<(t: string) => Promise<void>>(() => Promise.resolve());

beforeEach(() => {
  writeText.mockClear();
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
});

const copiedTexts = () => writeText.mock.calls.map((c) => c[0]);
const copyAll = () =>
  screen.getAllByRole('button', { name: /^Copier : / }).forEach((b) => fireEvent.click(b));

describe('onglets', () => {
  it('fermés au départ, restent ouverts, compteur', () => {
    const { container } = render(<BilanApp />);
    const secs = [...container.querySelectorAll<HTMLDetailsElement>('details.bilan-sec')];
    expect(secs.length).toBeGreaterThan(0);
    expect(secs.every((d) => !d.open)).toBe(true);
    const sec = (title: string) =>
      secs.find((d) => d.querySelector('.bilan-sec-title')?.textContent === title)!;
    fireEvent.click(sec('Force').querySelector('summary')!);
    expect(sec('Force').open).toBe(true);
    fireEvent.click(sec('Mobilité').querySelector('summary')!);
    expect(sec('Force').open).toBe(true);
    expect(sec('Mobilité').open).toBe(true);
    const count = () => sec('5. Sous-acromial et coiffe').querySelector('.bilan-sec-count')!;
    expect(count()).toHaveTextContent('0/10');
    fireEvent.click(within(screen.getByRole('group', { name: 'Full can' })).getByLabelText('positif'));
    expect(count()).toHaveTextContent('1/10');
    expect(count()).toHaveAttribute('aria-label', '1 champs remplis sur 10');
  });

  it('Ajouter ouvre l’onglet fermé du test suggéré', () => {
    const { container } = render(<BilanApp />);
    fireEvent.click(within(screen.getByRole('group', { name: 'Full can' })).getByLabelText('positif'));
    fireEvent.click(suggestions().getByRole('button', { name: 'Ajouter ER lag sign' }));
    const tests = [...container.querySelectorAll<HTMLDetailsElement>('details.bilan-sec')].find(
      (d) => d.querySelector('.bilan-sec-title')?.textContent === '5. Sous-acromial et coiffe',
    )!;
    expect(tests.open).toBe(true);
    expect(document.activeElement).toBe(screen.getByRole('group', { name: 'ER lag sign' }));
  });
});

describe('écran de bilan', () => {
  it('affiche l’accueil puis les 12 sections dans l’ordre de l’algorithme', () => {
    const { container } = render(<BilanApp />);
    expect([...container.querySelectorAll('.bilan-sec-title')].map((s) => s.textContent)).toEqual([
      'Accueil',
      'Anamnèse',
      'Drapeaux',
      'Mobilité',
      '1. Épaule raide ?',
      '2. Épaule instable ?',
      '3. Origine cervicale ?',
      '4. Acromio-claviculaire ?',
      '5. Sous-acromial et coiffe',
      '6. Modification des symptômes',
      'Force',
      'Raisonnement',
      'Plan',
    ]);
    expect(screen.getByText(/^B-\d{4}$/)).toBeInTheDocument();
    expect(screen.getByText(/Aide au raisonnement clinique, non validée/)).toBeInTheDocument();
  });

  it('suggestions : full can positif → ER lag et Drop arm ; Ignorer la retire', () => {
    render(<BilanApp />);
    fireEvent.click(within(screen.getByRole('group', { name: 'Full can' })).getByLabelText('positif'));
    expect(suggestions().getByText('ER lag sign')).toBeInTheDocument();
    expect(suggestions().getByText('Drop arm')).toBeInTheDocument();
    expect(suggestions().getAllByText('Source provisoire').length).toBeGreaterThan(0);
    fireEvent.click(suggestions().getByRole('button', { name: 'Ignorer Drop arm' }));
    expect(suggestions().queryByText('Drop arm')).toBeNull();
    expect(suggestions().getByText('ER lag sign')).toBeInTheDocument();
  });

  it('Ajouter un test place le focus sur son groupe', () => {
    render(<BilanApp />);
    fireEvent.click(within(screen.getByRole('group', { name: 'Full can' })).getByLabelText('positif'));
    fireEvent.click(suggestions().getByRole('button', { name: 'Ajouter ER lag sign' }));
    expect(document.activeElement).toBe(screen.getByRole('group', { name: 'ER lag sign' }));
  });

  it('Ajouter un questionnaire → liste « Questionnaires à proposer »', () => {
    render(<BilanApp />);
    fireEvent.change(notes('Anamnèse'), { target: { value: 'Douleur depuis 2 semaines' } });
    fireEvent.click(suggestions().getByRole('button', { name: /^Ajouter .*SPADI/ }));
    const list = screen.getByRole('list', { name: 'Questionnaires à proposer' });
    expect(within(list).getByText(/SPADI/)).toBeInTheDocument();
  });

  it('mots-clés : deux invites, Cocher coche la pastille', () => {
    render(<BilanApp />);
    fireEvent.change(notes('Anamnèse'), { target: { value: 'fourmillements la nuit' } });
    expect(screen.getByText(/Tu as noté « fourmillements » : cocher paresthésies \?/)).toBeInTheDocument();
    expect(screen.getByText(/Tu as noté « nuit » : cocher nocturne \?/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cocher paresthésies' }));
    expect(screen.getByLabelText('paresthésies')).toBeChecked();
    expect(screen.queryByText(/cocher paresthésies/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Non, ne pas cocher nocturne' }));
    expect(screen.queryByText(/cocher nocturne/)).toBeNull();
    expect(screen.getByLabelText('nocturne')).not.toBeChecked();
  });

  it('négation : « (peut-être nié) », rien de coché', () => {
    render(<BilanApp />);
    fireEvent.change(notes('Drapeaux'), { target: { value: 'pas de fièvre' } });
    expect(screen.getByText(/cocher fièvre \? \(peut-être nié\)/)).toBeInTheDocument();
    expect(screen.getByLabelText('fièvre')).not.toBeChecked();
  });

  it('valeur hors bornes : message, et absente du bloc copié', () => {
    render(<BilanApp />);
    fireEvent.change(screen.getByLabelText('Abduction active D'), { target: { value: '500' } });
    fireEvent.change(screen.getByLabelText('Abduction active G'), { target: { value: '170' } });
    expect(screen.getByText(/Valeur hors plage/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Copier : Bilan articulaire' }));
    expect(copiedTexts()).toEqual(['Abduction active : G 170°']);
  });

  it('l’identité ne va dans aucun bloc SYSmeta', () => {
    render(<BilanApp />);
    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Dupont' } });
    fireEvent.change(notes('Anamnèse'), { target: { value: 'Chute à vélo' } });
    fireEvent.click(within(screen.getByRole('group', { name: 'Neer' })).getByLabelText('négatif'));
    copyAll();
    expect(copiedTexts().length).toBeGreaterThan(0);
    expect(copiedTexts().join('\n')).not.toContain('Dupont');
  });

  it('onChange reçoit le nouvel état', () => {
    const onChange = vi.fn();
    render(<BilanApp onChange={onChange} />);
    fireEvent.change(notes('Plan'), { target: { value: 'Rebilan à 6 semaines' } });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ notes: { 'plan.notes': 'Rebilan à 6 semaines' } }),
    );
  });

  it('Nouveau bilan : confirmation intégrée puis remise à zéro', () => {
    render(<BilanApp />);
    fireEvent.change(notes('Plan'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Nouveau bilan' }));
    fireEvent.click(screen.getByRole('button', { name: 'Effacer' }));
    expect(notes('Plan')).toHaveValue('');
  });
});

describe('route', () => {
  it('#/bilan affiche le bilan, sinon l’app PDDM', async () => {
    const { default: Root } = await import('../src/Root');
    location.hash = '#/bilan';
    const { unmount } = render(<Root />);
    expect(await screen.findByRole('button', { name: /Créer le PIN|Déverrouiller/ })).toBeInTheDocument();
    unmount();
    location.hash = '';
    render(<Root />);
    expect(screen.getByRole('heading', { name: 'Bienvenue' })).toBeInTheDocument();
  });
});
