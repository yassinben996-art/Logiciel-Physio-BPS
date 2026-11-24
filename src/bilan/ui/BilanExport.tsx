// Export : un bouton « Copier » par rubrique SYSmeta et le PDF du bilan.
import { useState } from 'react';
import type { ZoneDef } from '../content/types';
import { bilanSummaryLines, sysmetaBlocks } from '../engine/exports';
import type { BilanState } from '../state/bilan';

export default function BilanExport({ zone, state }: { zone: ZoneDef; state: BilanState }) {
  const [copied, setCopied] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
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
      const r = await exportPdf(bilanSummaryLines(zone, state, new Date()), new Date(), 'bilan');
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
      {msg && (
        <p className="note err" role="status">
          {msg}
        </p>
      )}
    </section>
  );
}
