// Bloc « Évolution » : une colonne par bilan du patient, écart du premier au dernier, sans jugement.
import type { ZoneDef } from '../content/types';
import { evolutionRows } from '../engine/evolution';
import { frDay, zurichDay } from '../engine/followup';
import type { BilanState } from '../state/bilan';

export default function Evolution({ zone, columns }: { zone: ZoneDef; columns: readonly BilanState[] }) {
  const rows = evolutionRows(zone, columns);
  return (
    <section className="bilan-evolution" aria-labelledby="bilan-evo-title">
      <h2 id="bilan-evo-title">Évolution</h2>
      {rows.length === 0 ? (
        <p className="note">Rien à comparer pour l’instant.</p>
      ) : (
        <div className="evo-scroll">
          <table className="evo-table">
            <thead>
              <tr>
                <th scope="col">Mesure</th>
                {columns.map((b) => (
                  <th key={b.id} scope="col">
                    {frDay(zurichDay(b.createdAt))}
                  </th>
                ))}
                <th scope="col">Écart</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label}>
                  <th scope="row">{r.label}</th>
                  {r.values.map((v, i) => (
                    <td key={i}>{v ?? '–'}</td>
                  ))}
                  <td className="evo-delta">{r.delta ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
