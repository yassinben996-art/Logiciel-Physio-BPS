// « Mes bilans » : recherche, ouverture, suppression (avec confirmation intégrée).
import { useState, type ReactNode } from 'react';
import { dueList, frDay, today, zurichDay } from '../engine/followup';
import { normalize } from '../engine/keywords';
import type { BilanMeta } from '../storage/vault';

interface Props {
  items: readonly BilanMeta[];
  onOpen: (id: string) => void;
  onNew: () => void;
  onRemove: (id: string) => void;
  onLock: () => void;
  /** Affiché sous la liste (section Synchronisation). */
  footer?: ReactNode;
  /** Rebilan du patient de ce bilan (onglet « À rebilanter »). */
  onRebilan?: (id: string) => void;
  /** Repousse la date du prochain rebilan de ce bilan de N jours à partir d'aujourd'hui. */
  onPostpone?: (id: string, days: number) => void;
}

/** « 25.11 à 14:03 » (heure de Lausanne). */
const conflictDate = (iso: string) => {
  const d = new Date(iso);
  const p = (o: Intl.DateTimeFormatOptions) => d.toLocaleString('fr-CH', { ...o, timeZone: 'Europe/Zurich' });
  return `${p({ day: '2-digit', month: '2-digit' })} à ${p({ hour: '2-digit', minute: '2-digit' })}`;
};

export default function BilanList({
  items,
  onOpen,
  onNew,
  onRemove,
  onLock,
  footer,
  onRebilan,
  onPostpone,
}: Props) {
  const [q, setQ] = useState('');
  const [confirm, setConfirm] = useState<string | null>(null);
  const nq = normalize(q.trim());
  const shown = items.filter((m) => !nq || normalize(`${m.label} ${m.code}`).includes(nq));
  const [tab, setTab] = useState<'all' | 'due'>('all');
  const [postponing, setPostponing] = useState<string | null>(null);
  const due = dueList(items, today());
  return (
    <div className="bilan bilan-listpage bilan-theme">
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
      {items.length > 0 && (
        <div className="bilan-tabs" role="tablist" aria-label="Affichage">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'all'}
            className="bilan-tab"
            onClick={() => setTab('all')}
          >
            Tous les bilans
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'due'}
            className="bilan-tab"
            onClick={() => setTab('due')}
          >
            À rebilanter ({due.length})
          </button>
        </div>
      )}
      {tab === 'due' && items.length > 0 ? (
        due.length === 0 ? (
          <p className="note">Aucun patient à rebilanter pour l’instant.</p>
        ) : (
          <ul className="bilan-items" aria-label="Patients à rebilanter">
            {due.map(({ meta: m, late }) => (
              <li key={m.id}>
                <div className="bilan-item-text">
                  <strong>{m.label}</strong>
                  <span className="note">
                    dernier bilan le {m.createdAt ? frDay(zurichDay(m.createdAt)) : '?'},{' '}
                    {late === 0 ? 'à faire aujourd’hui' : `en retard de ${late} jour${late > 1 ? 's' : ''}`}
                  </span>
                </div>
                <div className="row">
                  {onRebilan && (
                    <button
                      type="button"
                      className="btn small"
                      aria-label={`Rebilan ${m.label}`}
                      onClick={() => onRebilan(m.id)}
                    >
                      Rebilan
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn small ghost"
                    aria-label={`Ouvrir ${m.label}`}
                    onClick={() => onOpen(m.id)}
                  >
                    Ouvrir
                  </button>
                  {onPostpone &&
                    (postponing === m.id ? (
                      <div className="confirm" role="group" aria-label="Repousser">
                        {[
                          [7, '+1 semaine'],
                          [14, '+2 semaines'],
                        ].map(([d, label]) => (
                          <button
                            key={d}
                            type="button"
                            className="btn small ghost"
                            onClick={() => {
                              setPostponing(null);
                              onPostpone(m.id, d as number);
                            }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn small ghost"
                        aria-label={`Repousser ${m.label}`}
                        onClick={() => setPostponing(m.id)}
                      >
                        Repousser
                      </button>
                    ))}
                </div>
              </li>
            ))}
          </ul>
        )
      ) : items.length === 0 ? (
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
                  {m.qStatus && (
                    <span className={`homeq-pill q-${m.qStatus}`}>
                      {m.qStatus === 'received' ? 'réponses reçues' : 'questionnaires en attente'}
                    </span>
                  )}
                  {m.conflictOf && m.conflictAt && (
                    <span className="note err">copie en conflit, du {conflictDate(m.conflictAt)}</span>
                  )}
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
      {footer}
    </div>
  );
}
