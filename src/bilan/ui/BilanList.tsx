// « Mes bilans » : recherche, ouverture, suppression (avec confirmation intégrée).
import { useState } from 'react';
import { normalize } from '../engine/keywords';
import type { BilanMeta } from '../storage/vault';

interface Props {
  items: readonly BilanMeta[];
  onOpen: (id: string) => void;
  onNew: () => void;
  onRemove: (id: string) => void;
  onLock: () => void;
}

export default function BilanList({ items, onOpen, onNew, onRemove, onLock }: Props) {
  const [q, setQ] = useState('');
  const [confirm, setConfirm] = useState<string | null>(null);
  const nq = normalize(q.trim());
  const shown = items.filter((m) => !nq || normalize(`${m.label} ${m.code}`).includes(nq));
  return (
    <div className="bilan bilan-listpage">
      <header className="bilan-head bilan-listhead">
        <h1>Mes bilans</h1>
        <div className="bilan-tools">
          <button type="button" className="btn small" onClick={onNew}>
            Nouveau bilan
          </button>
          <button type="button" className="btn small ghost" onClick={onLock}>
            Verrouiller
          </button>
        </div>
      </header>
      {items.length === 0 ? (
        <p className="note">Aucun bilan enregistré.</p>
      ) : (
        <>
          <div className="f bilan-search">
            <label htmlFor="bilan-q">Rechercher</label>
            <input id="bilan-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <ul className="bilan-items" aria-label="Bilans enregistrés">
            {shown.map((m) => (
              <li key={m.id}>
                <div className="bilan-item-text">
                  <strong>{m.label}</strong>
                  <span className="note">
                    {m.label !== m.code ? `${m.code} · ` : ''}
                    modifié le{' '}
                    {new Date(m.updatedAt).toLocaleString('fr-CH', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
                {confirm === m.id ? (
                  <div className="confirm" role="group" aria-label="Confirmer">
                    <span>Supprimer définitivement ce bilan ?</span>
                    <button
                      type="button"
                      className="btn small danger"
                      onClick={() => {
                        setConfirm(null);
                        onRemove(m.id);
                      }}
                    >
                      Confirmer la suppression
                    </button>
                    <button type="button" className="btn small ghost" onClick={() => setConfirm(null)}>
                      Annuler
                    </button>
                  </div>
                ) : (
                  <div className="row">
                    <button
                      type="button"
                      className="btn small"
                      aria-label={`Ouvrir ${m.label}`}
                      onClick={() => onOpen(m.id)}
                    >
                      Ouvrir
                    </button>
                    <button
                      type="button"
                      className="btn small ghost"
                      aria-label={`Supprimer ${m.label}`}
                      onClick={() => setConfirm(m.id)}
                    >
                      Supprimer
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {shown.length === 0 && <p className="note">Aucun bilan ne correspond.</p>}
        </>
      )}
    </div>
  );
}
