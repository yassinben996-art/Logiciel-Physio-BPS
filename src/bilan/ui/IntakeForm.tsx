// Accueil rempli par le patient sur la tablette (puis, à l'étape 3, sur son téléphone par QR code).
// N'affiche aucune donnée d'identité ni aucun autre bilan. Aucune réponse n'est obligatoire.
import { useEffect, useRef, useState } from 'react';
import { ChoiceCards, Scale } from '../../components/inputs';
import { P_DURATION, P_ONSET } from '../../data/patient';
import type { Duration, Onset } from '../../engine/types';
import { SCREENING } from '../content/intake';
import { emptyIntake, PSFS_MAX, sanitizeIntake, type Intake, type PsfsItem } from '../state/intake';
import BodyChart from './BodyChart';

interface Props {
  zoneLabel: string;
  initial?: Intake;
  onDone: (i: Intake) => void;
  /** Brouillon à chaque réponse (completedAt vide), pour ne rien perdre si la page se ferme. */
  onDraft?: (i: Intake) => void;
}

const entries = <T extends string>(r: Readonly<Record<T, string>>) =>
  (Object.keys(r) as T[]).map((value) => ({ value, label: r[value] }));

export default function IntakeForm({ zoneLabel, initial, onDone, onDraft }: Props) {
  const [i, setI] = useState<Intake>(initial ?? emptyIntake());
  const [psfs, setPsfs] = useState<PsfsItem[]>(() =>
    Array.from({ length: PSFS_MAX }, (_, k) => initial?.psfs[k] ?? { activity: '', score: null }),
  );
  const [sent, setSent] = useState(false);
  const draftCb = useRef(onDraft);
  useEffect(() => {
    draftCb.current = onDraft;
  }, [onDraft]);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    draftCb.current?.(sanitizeIntake({ ...i, psfs, completedAt: '' }));
  }, [i, psfs]);
  const patch = (p: Partial<Intake>) => setI((x) => ({ ...x, ...p }));
  const setPsfsAt = (k: number, p: Partial<PsfsItem>) =>
    setPsfs((l) => l.map((x, j) => (j === k ? { ...x, ...p } : x)));
  const toggle = (id: string) =>
    patch({ regions: i.regions.includes(id) ? i.regions.filter((r) => r !== id) : [...i.regions, id] });

  return (
    <div className="intake">
      <header className="intake-head">
        <p className="eyebrow">Physiothérapie · {zoneLabel}</p>
        <h1>Avant votre séance</h1>
        <p className="note">
          Ces réponses aident votre physiothérapeute à préparer la séance. Il n’y a pas de bonne ou de
          mauvaise réponse, et vous pouvez laisser une question vide.
        </p>
      </header>

      <section className="intake-block" aria-labelledby="intake-where">
        <h2 id="intake-where">Où avez-vous mal ?</h2>
        <p className="note">Touchez les zones douloureuses sur le dessin. Touchez à nouveau pour retirer.</p>
        <BodyChart selected={i.regions} onToggle={toggle} />
      </section>

      <section className="intake-block">
        <Scale
          name="pain-now"
          legend="Votre douleur maintenant"
          value={i.painNow}
          onChange={(v) => patch({ painNow: v })}
          lo="aucune douleur"
          hi="la pire imaginable"
        />
        <Scale
          name="pain-worst"
          legend="La douleur la plus forte cette dernière semaine"
          value={i.painWorst}
          onChange={(v) => patch({ painWorst: v })}
          lo="aucune douleur"
          hi="la pire imaginable"
        />
      </section>

      <section className="intake-block">
        <ChoiceCards<Duration>
          name="duration"
          legend="Depuis combien de temps avez-vous ce problème ?"
          options={entries(P_DURATION)}
          value={i.duration}
          onChange={(v) => patch({ duration: v })}
        />
        <ChoiceCards<Onset>
          name="onset"
          legend="Comment est-ce que ça a commencé ?"
          options={entries(P_ONSET)}
          value={i.onset}
          onChange={(v) => patch({ onset: v })}
        />
      </section>

      <section className="intake-block" aria-labelledby="intake-psfs">
        <h2 id="intake-psfs">Activités difficiles</h2>
        <p className="note">
          Citez jusqu’à 3 activités que vous avez du mal à faire à cause de ce problème. Notez votre capacité
          de 0 (incapable de la faire) à 10 (comme avant le problème).
        </p>
        {psfs.map((p, k) => (
          <div key={k} className="intake-psfs">
            <div className="field">
              <label htmlFor={`psfs-a-${k}`}>Activité {k + 1}</label>
              <input
                id={`psfs-a-${k}`}
                type="text"
                maxLength={120}
                value={p.activity}
                onChange={(e) => setPsfsAt(k, { activity: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor={`psfs-s-${k}`}>Capacité pour l’activité {k + 1} (0 à 10)</label>
              <select
                id={`psfs-s-${k}`}
                value={p.score ?? ''}
                disabled={p.activity.trim() === ''}
                onChange={(e) =>
                  setPsfsAt(k, { score: e.target.value === '' ? null : Number(e.target.value) })
                }
              >
                <option value="">—</option>
                {Array.from({ length: 11 }, (_, n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </section>

      <section className="intake-block">
        {SCREENING.map((q) => (
          <ChoiceCards<'oui' | 'non'>
            key={q.id}
            name={`scr-${q.id}`}
            legend={q.patient}
            options={[
              { value: 'oui', label: 'Oui' },
              { value: 'non', label: 'Non' },
            ]}
            value={i.screening[q.id] === undefined ? null : i.screening[q.id] ? 'oui' : 'non'}
            onChange={(v) => patch({ screening: { ...i.screening, [q.id]: v === 'oui' } })}
            compact
          />
        ))}
      </section>

      <button
        type="button"
        className="btn intake-done"
        disabled={sent}
        onClick={() => {
          if (sent) return;
          setSent(true);
          onDone(sanitizeIntake({ ...i, psfs, completedAt: new Date().toISOString() }));
        }}
      >
        J’ai terminé
      </button>
    </div>
  );
}
