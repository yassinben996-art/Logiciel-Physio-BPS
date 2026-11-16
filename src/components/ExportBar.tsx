import { useState } from 'react';
import { summaryLines, toText } from '../engine/summary';
import type { CaseState } from '../engine/types';

export function ExportBar({ c }: { c: CaseState }) {
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const onPdf = async () => {
    setBusy(true);
    setMsg('Préparation du PDF…');
    try {
      const { exportPdf } = await import('../pdf/exportPdf');
      await exportPdf(summaryLines(c));
      setMsg('PDF généré et proposé au téléchargement.');
    } catch {
      setMsg('Export PDF impossible dans ce navigateur. Utilise « Copier le résumé ».');
    } finally {
      setBusy(false);
    }
  };

  const onCopy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard');
      await navigator.clipboard.writeText(toText(summaryLines(c)));
      setMsg('Résumé copié dans le presse-papiers.');
    } catch {
      setMsg('Copie refusée par le navigateur. Essaie l’export PDF.');
    }
  };

  return (
    <section className="card" id="s-export" aria-labelledby="h-export">
      <h2 id="h-export">
        <span className="n" aria-hidden="true">
          5
        </span>
        Garder une trace
      </h2>
      <p className="sub">
        Le résumé reprend le profil, les cibles et les interventions retenues, avec les références citées. Il
        ne contient que ce que tu as saisi ici : n’y mets jamais le nom complet du patient.
      </p>
      <div className="row">
        <button type="button" className="btn" onClick={onPdf} disabled={busy}>
          Exporter en PDF
        </button>
        <button type="button" className="btn ghost" onClick={onCopy}>
          Copier le résumé
        </button>
        <span className="note" role="status" aria-live="polite" style={{ margin: 0 }}>
          {msg}
        </span>
      </div>
    </section>
  );
}
