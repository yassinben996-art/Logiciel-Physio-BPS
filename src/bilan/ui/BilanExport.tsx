// Export : un bouton « Copier » par rubrique SYSmeta et le PDF du bilan.
import { useState } from 'react';
import type { ZoneDef } from '../content/types';
import { bilanSummaryLines, sysmetaBlocks } from '../engine/exports';
import { buildSummary } from '../ai/summary';
import { CLAUDE_PROMPT } from '../content/aiPrompt';
import { INTAKE } from '../content/intake';
import TextPreview from './TextPreview';
import type { BilanState } from '../state/bilan';

export default function BilanExport({
  zone,
  state,
  series = [],
}: {
  zone: ZoneDef;
  state: BilanState;
  /** Colonnes de l'évolution (rebilan), pour le PDF. */
  series?: readonly BilanState[];
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [claude, setClaude] = useState<'idle' | 'preview' | 'copied'>('idle');
  const blocks = sysmetaBlocks(zone, state);
  const copy = async (rubric: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(rubric);
    } catch {
      setMsg('Copie impossible dans ce navigateur.');
    }
  };
  const pdf = async () => {
    setMsg(null);
    try {
      const { exportPdf } = await import('../../pdf/exportPdf');
      const r = await exportPdf(bilanSummaryLines(zone, state, new Date(), series), new Date(), 'bilan');
      if (r === 'declined') setMsg('Téléchargement annulé.');
    } catch {
      setMsg('La génération du PDF a échoué.');
    }
  };
  return (
    <section className="bilan-export" aria-labelledby="bilan-export-title">
      <h2 id="bilan-export-title">Export</h2>
      <h3>Copier pour SYSmeta</h3>
      {blocks.length === 0 ? (
        <p className="note">Rien à copier pour l’instant.</p>
      ) : (
        <div className="row">
          {blocks.map((b) => (
            <button
              key={b.rubric}
              type="button"
              className="btn small ghost"
              aria-label={`Copier : ${b.rubric}`}
              onClick={() => void copy(b.rubric, b.text)}
            >
              {b.rubric}
              {copied === b.rubric ? ' · Copié' : ''}
            </button>
          ))}
        </div>
      )}
      <div className="row">
        <button type="button" className="btn small" onClick={() => void pdf()}>
          PDF
        </button>
      </div>
      <h3>Copier pour Claude</h3>
      {claude === 'preview' ? (
        <TextPreview
          title="Texte copié pour Claude"
          note="Sans le nom du patient : relis avant de copier."
          initial={`${CLAUDE_PROMPT}\n\n${buildSummary(zone, state, INTAKE)}`}
          confirmLabel="Copier"
          onConfirm={(text) =>
            void navigator.clipboard.writeText(text).then(
              () => setClaude('copied'),
              () => setMsg('Copie impossible dans ce navigateur.'),
            )
          }
          onCancel={() => setClaude('idle')}
        />
      ) : (
        <div className="row">
          <button type="button" className="btn small ghost" onClick={() => setClaude('preview')}>
            Copier pour Claude
          </button>
          {claude === 'copied' && <span className="note">Copié</span>}
        </div>
      )}
      {msg && (
        <p className="note err" role="status">
          {msg}
        </p>
      )}
    </section>
  );
}
