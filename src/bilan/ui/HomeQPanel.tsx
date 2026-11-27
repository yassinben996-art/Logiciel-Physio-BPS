// Questionnaires à domicile : choix des questionnaires, QR code et lien pour le patient, suivi, réponses reçues.
import { useState, type Dispatch } from 'react';
import { QUESTIONNAIRES } from '../../questionnaires/public';
import { scoreQ } from '../../questionnaires/scoring';
import type { ZoneDef } from '../content/types';
import type { Suggestion } from '../engine/rules';
import { homeLink } from '../homeq/link';
import { proposeHomeQuestionnaires } from '../homeq/propose';
import type { BilanAction, BilanState, HomeRequest } from '../state/bilan';
import PairingQr from './PairingQr';

export interface HomeQCreate {
  /** Crée le ticket sur le relais et la clé ; renvoie la demande à enregistrer dans le bilan. */
  create(ids: readonly string[]): Promise<HomeRequest>;
}

interface Props {
  zone: ZoneDef;
  state: BilanState;
  dispatch: Dispatch<BilanAction>;
  suggestions: readonly Suggestion[];
  /** null : synchronisation non active. */
  homeQ: HomeQCreate | null | undefined;
  /** Adresse du site, devant « #/q… » (par défaut, la page actuelle). */
  base?: string;
}

const frDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Zurich',
  });

export default function HomeQPanel({ zone, state: s, dispatch, suggestions, homeQ, base }: Props) {
  const [composing, setComposing] = useState(false);
  const [picked, setPicked] = useState<readonly string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const site = base ?? location.origin + location.pathname;
  const proposed = proposeHomeQuestionnaires(zone, s, suggestions);
  const chosen = picked ?? proposed;
  const req = s.homeQ;
  const live = !!req && req.expiresAt > new Date().toISOString();
  const showForm = !req || composing;

  const create = async () => {
    if (!homeQ || !chosen.length) return;
    setBusy(true);
    setMsg(null);
    try {
      const ids = QUESTIONNAIRES.map((q) => q.id).filter((id) => chosen.includes(id));
      dispatch({ type: 'homeQCreate', req: await homeQ.create(ids) });
      setComposing(false);
      setPicked(null);
      setCopied(false);
    } catch (e) {
      setMsg(
        e instanceof TypeError
          ? 'Hors connexion : réessaie quand le réseau revient.'
          : 'Création impossible pour le moment.',
      );
    } finally {
      setBusy(false);
    }
  };
  const link = req ? homeLink(site, req) : '';
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setMsg('Copie impossible dans ce navigateur.');
    }
  };
  const results = QUESTIONNAIRES.filter((q) => q.id in s.qResults);

  return (
    <section className="bilan-homeq" aria-labelledby="bilan-homeq-title">
      <h2 id="bilan-homeq-title">Questionnaires à domicile</h2>
      {results.length > 0 && (
        <div className="homeq-results">
          <h3>Réponses du patient</h3>
          <ul>
            {results.map((q) => {
              const r = s.qResults[q.id]!;
              const sc = scoreQ(q, r.answers);
              return (
                <li key={q.id}>
                  <strong>{q.name}</strong>
                  <span className="homeq-score">
                    {sc ? sc.display : 'aucune réponse'}
                    {sc && !sc.valid ? ` · ${sc.note ?? 'non valable'}` : sc?.note ? ` · ${sc.note}` : ''}
                  </span>
                  {sc?.parts && <span className="note">{sc.parts.join(' · ')}</span>}
                  <span className="note">reçu le {frDate(r.at)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {!homeQ ? (
        <p className="note">Active la synchronisation pour envoyer des questionnaires au patient.</p>
      ) : showForm ? (
        <fieldset className="homeq-pick">
          <legend>À remplir par le patient chez lui</legend>
          {QUESTIONNAIRES.map((q) => (
            <label key={q.id} className="chip">
              <input
                type="checkbox"
                checked={chosen.includes(q.id)}
                onChange={(e) =>
                  setPicked(e.target.checked ? [...chosen, q.id] : chosen.filter((id) => id !== q.id))
                }
              />
              <span>
                {q.name}
                {proposed.includes(q.id) && <span className="homeq-prop"> · proposé</span>}
              </span>
            </label>
          ))}
          <div className="row">
            <button
              type="button"
              className="btn small"
              disabled={busy || !chosen.length}
              onClick={() => void create()}
            >
              {busy ? 'Un instant…' : 'Créer le QR code'}
            </button>
            {composing && (
              <button type="button" className="btn small ghost" onClick={() => setComposing(false)}>
                Annuler
              </button>
            )}
          </div>
        </fieldset>
      ) : live ? (
        <div className="homeq-link">
          <p className="homeq-wait">En attente des réponses du patient</p>
          <PairingQr text={link} label="QR code des questionnaires" />
          <p className="note">
            Le patient scanne ce QR code avec l’appareil photo de son téléphone, ou tu lui envoies le lien.
            Lien valable jusqu’au {frDate(req.expiresAt)}, une seule fois.
          </p>
          <p className="homeq-url">{link}</p>
          <div className="row">
            <button type="button" className="btn small" onClick={() => void copy()}>
              {copied ? 'Copié' : 'Copier le lien'}
            </button>
            <button type="button" className="btn small ghost" onClick={() => setComposing(true)}>
              Nouvel envoi
            </button>
          </div>
        </div>
      ) : (
        <div className="row">
          <p className="note">Le lien a expiré sans réponse.</p>
          <button type="button" className="btn small ghost" onClick={() => setComposing(true)}>
            Nouvel envoi
          </button>
        </div>
      )}
      {msg && (
        <p className="note err" role="alert">
          {msg}
        </p>
      )}
    </section>
  );
}
