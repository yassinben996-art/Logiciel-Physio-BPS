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
      const r = await exportPdf(summaryLines(c));
      setMsg(r === 'declined' ? 'Téléchargement annulé.' : 'PDF généré et proposé au téléchargement.');
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
    <section className="panel" id="s-export">
      <div className="panel-h">
        <h2>Garder une trace</h2>
      </div>
      <p className="note">
        Le résumé reprend le profil, les cibles, les interventions et les références citées.
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
