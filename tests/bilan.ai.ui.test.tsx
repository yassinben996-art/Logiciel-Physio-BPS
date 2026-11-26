import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CLAUDE_PROMPT } from '../src/bilan/content/aiPrompt';
import { emptyBilan, type BilanState } from '../src/bilan/state/bilan';
import { RelayError } from '../src/bilan/sync/api';
import BilanApp from '../src/bilan/ui/BilanApp';

const writeText = vi.fn<(t: string) => Promise<void>>(() => Promise.resolve());
beforeEach(() => {
  writeText.mockClear();
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
});

const initial = (): BilanState => ({
  ...emptyBilan('shoulder'),
  identity: { nom: 'Dupont', prenom: 'Marie', naissance: '' },
  notes: { 'anamnese.notes': 'Dupont a mal' },
});
const reply = JSON.stringify({
  suggestions: [
    { type: 'hypothese', label: 'Tendinopathie de la coiffe', reason: 'Douleur à l’élévation' },
    { type: 'test', label: 'Test de Neer', reason: 'Conflit sous-acromial' },
  ],
});
const panel = () => within(screen.getByRole('region', { name: 'Suggestions' }));
const section = (title: string) =>
  [...document.querySelectorAll<HTMLDetailsElement>('details.bilan-sec')].find(
    (d) => d.querySelector('.bilan-sec-title')?.textContent === title,
  )!;

describe('Demander à l’IA', () => {
  it('sans synchronisation : message', () => {
    render(<BilanApp initial={initial()} ai={null} />);
    expect(panel().getByText('Active la synchronisation pour utiliser l’IA.')).toBeInTheDocument();
  });

  it('aperçu nettoyé, retouche envoyée, suggestions, Noter et Ajouter', async () => {
    const ask = vi.fn<(user: string) => Promise<{ provider: string; model: string; text: string }>>(
      async () => ({
        provider: 'Groq',
        model: 'openai/gpt-oss-120b',
        text: reply,
      }),
    );
    render(<BilanApp initial={initial()} ai={{ ask }} />);
    fireEvent.click(panel().getByRole('button', { name: 'Demander à l’IA' }));
    const box = panel().getByRole('textbox', { name: 'Voici ce qui sera envoyé' }) as HTMLTextAreaElement;
    expect(box.value).not.toContain('Dupont');
    expect(box.value).toContain('[nom] a mal');
    fireEvent.change(box, { target: { value: box.value + '\nretouche' } });
    fireEvent.click(panel().getByRole('button', { name: 'Envoyer' }));
    expect(await panel().findByText('Suggestions de Groq · openai/gpt-oss-120b')).toBeInTheDocument();
    expect(ask.mock.calls[0]![0]).toContain('retouche');
    expect(panel().getAllByText('IA · non sourcé')).toHaveLength(2);
    fireEvent.click(panel().getByRole('button', { name: 'Noter Tendinopathie de la coiffe' }));
    fireEvent.click(section('Raisonnement').querySelector('summary')!);
    expect(
      (screen.getByRole('textbox', { name: 'Notes (Raisonnement)' }) as HTMLTextAreaElement).value,
    ).toContain('Suggestion IA (non sourcée) : Tendinopathie de la coiffe — Douleur à l’élévation');
    fireEvent.click(panel().getByRole('button', { name: 'Ajouter Test de Neer' }));
    expect(section('5. Sous-acromial et coiffe').open).toBe(true);
  });

  it('IA indisponible : message, les règles restent', async () => {
    const ask = vi.fn(async () => {
      throw new RelayError(503, '');
    });
    render(<BilanApp initial={{ ...initial(), tests: { 'tests.full_can': 'pos' } }} ai={{ ask }} />);
    fireEvent.click(panel().getByRole('button', { name: 'Demander à l’IA' }));
    fireEvent.click(panel().getByRole('button', { name: 'Envoyer' }));
    expect(
      await panel().findByText('IA indisponible pour le moment, seules les règles sont actives'),
    ).toBeInTheDocument();
    expect(panel().getByText('ER lag sign')).toBeInTheDocument();
  });

  it('réponse illisible', async () => {
    const ask = vi.fn(async () => ({ provider: 'Groq', model: 'm', text: 'désolé' }));
    render(<BilanApp initial={initial()} ai={{ ask }} />);
    fireEvent.click(panel().getByRole('button', { name: 'Demander à l’IA' }));
    fireEvent.click(panel().getByRole('button', { name: 'Envoyer' }));
    expect(await panel().findByText('L’IA a répondu de façon inattendue')).toBeInTheDocument();
  });

  it('hors connexion', async () => {
    const ask = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    render(<BilanApp initial={initial()} ai={{ ask }} />);
    fireEvent.click(panel().getByRole('button', { name: 'Demander à l’IA' }));
    fireEvent.click(panel().getByRole('button', { name: 'Envoyer' }));
    expect(await panel().findByText('Hors connexion')).toBeInTheDocument();
  });
});

describe('Copier pour Claude', () => {
  it('aperçu puis copie, sans identité', async () => {
    render(<BilanApp initial={initial()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copier pour Claude' }));
    fireEvent.click(screen.getByRole('button', { name: 'Copier' }));
    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
    const text = writeText.mock.calls[0]![0];
    expect(text.startsWith(CLAUDE_PROMPT.slice(0, 40))).toBe(true);
    expect(text).not.toContain('Dupont');
    expect(await screen.findByText('Copié')).toBeInTheDocument();
  });
});
