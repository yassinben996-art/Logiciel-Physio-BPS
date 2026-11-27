// Page du patient (sur son téléphone) : questionnaires à domicile, puis envoi chiffré au relais.
// Ni le nom du patient ni celui du physio n'apparaissent ; aucun score n'est montré.
import { useEffect, useRef, useState } from 'react';
import { QuestionnairePage } from '../../components/patient/QuestionnairePage';
import { QUESTIONNAIRES } from '../../questionnaires/public';
import type { QDef } from '../../questionnaires/types';
import type { Action } from '../../state/reducer';
import { loadDraft, saveDraft } from '../homeq/draft';
import { parseHomeLink, sealAnswers, type HomeAnswers } from '../homeq/link';
import type { Box } from '../storage/crypto';
import { homeSubmit, RelayError } from '../sync/api';

interface Props {
  hash: string;
  relayUrl: string;
  /** Dépôt (injectable pour les tests). */
  submit?: (ticket: string, box: Box) => Promise<void>;
}

type Step =
  | { k: 'loading' }
  | { k: 'welcome' }
  | { k: 'page'; i: number }
  | { k: 'review' }
  | { k: 'sent' }
  | { k: 'already' };

const GONE = 'Ce lien n’est plus valable. Demandez-en un nouveau à votre physiothérapeute.';
const OFFLINE = 'Pas de connexion pour le moment. Vos réponses sont gardées sur ce téléphone.';

export default function PatientHomeQ({ hash, relayUrl, submit }: Props) {
  const link = parseHomeLink(hash);
  const qs: QDef[] = link ? QUESTIONNAIRES.filter((q) => link.ids.includes(q.id)) : [];
  const pages = qs.flatMap((q, qi) => q.pages.map((page, pi) => ({ q, qi, page, pi })));
  const [step, setStep] = useState<Step>({ k: 'loading' });
  const [answers, setAnswers] = useState<HomeAnswers>({});
  const [err, setErr] = useState<{ text: string; retry: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const ticket = link?.ticket ?? '';
  const top = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!ticket) return;
    let alive = true;
    void loadDraft(ticket).then((d) => {
      if (!alive) return;
      if (d?.sent) return setStep({ k: 'already' });
      if (d) setAnswers(d.answers);
      setStep({ k: 'welcome' });
    });
    return () => {
      alive = false;
    };
  }, [ticket]);
  useEffect(() => {
    top.current?.focus();
    window.scrollTo?.(0, 0);
  }, [step]);

  if (!link)
    return (
      <Shell title="Ce lien n’est pas valable." text="Demandez un nouveau lien à votre physiothérapeute." />
    );
  if (step.k === 'loading') return <Shell title="Un instant…" />;
  if (step.k === 'already') return <Shell title="Vos réponses ont déjà été envoyées. Merci !" />;
  if (step.k === 'sent') return <Shell title="Merci, c’est envoyé. Vous pouvez fermer cette page." />;

  const dispatch = (a: Action) => {
    if (a.type !== 'qanswer') return;
    setAnswers((prev) => {
      const entry: Record<string, number> = { ...prev[a.q], [a.item]: a.value };
      if (a.index !== undefined) entry[`${a.item}#`] = a.index;
      const next = { ...prev, [a.q]: entry };
      void saveDraft(ticket, { answers: next });
      return next;
    });
  };
  const missing = qs.reduce(
    (n, q) =>
      n + q.pages.flatMap((p) => p.items).filter((it) => typeof answers[q.id]?.[it.id] !== 'number').length,
    0,
  );
  const minutes = Math.max(
    2,
    Math.round(qs.reduce((n, q) => n + q.pages.flatMap((p) => p.items).length, 0) / 5),
  );

  const send = async () => {
    setBusy(true);
    setErr(null);
    try {
      if (!relayUrl && !submit) throw new RelayError(503, 'relais absent');
      const box = await sealAnswers(link.key, answers);
      await (submit ?? ((t: string, b: Box) => homeSubmit(relayUrl, t, b)))(link.ticket, box);
      await saveDraft(ticket, { answers: {}, sent: true });
      setStep({ k: 'sent' });
    } catch (e) {
      if (e instanceof RelayError && e.status === 410) setErr({ text: GONE, retry: false });
      else if (e instanceof TypeError || (e instanceof RelayError && e.status >= 500))
        setErr({ text: OFFLINE, retry: true });
      else setErr({ text: 'L’envoi n’a pas abouti.', retry: true });
    } finally {
      setBusy(false);
    }
  };

  if (step.k === 'welcome')
    return (
      <main className="homeq-patient bilan-theme">
        <h1 ref={top} tabIndex={-1}>
          Questionnaires de votre physiothérapeute
        </h1>
        <p>
          {qs.length} questionnaire{qs.length > 1 ? 's' : ''} · environ {minutes} minutes
        </p>
        <p className="note">
          Vous pouvez vous arrêter et reprendre plus tard avec le même lien. Vos réponses sont chiffrées :
          seul votre physiothérapeute peut les lire.
        </p>
        <button type="button" className="btn" onClick={() => setStep({ k: 'page', i: 0 })}>
          Commencer
        </button>
      </main>
    );

  if (step.k === 'page') {
    const p = pages[step.i]!;
    return (
      <main className="homeq-patient bilan-theme">
        <p className="eyebrow">
          Questionnaire {p.qi + 1} sur {qs.length}
          {p.q.pages.length > 1 ? ` · partie ${p.pi + 1} sur ${p.q.pages.length}` : ''}
        </p>
        <h1 ref={top} tabIndex={-1}>
          {p.q.name}
        </h1>
        {p.page.intro && <p className="note">{p.page.intro}</p>}
        <QuestionnairePage q={p.q} page={p.page} qa={answers} dispatch={dispatch} />
        <div className="row homeq-nav">
          <button
            type="button"
            className="btn ghost"
            onClick={() => setStep(step.i === 0 ? { k: 'welcome' } : { k: 'page', i: step.i - 1 })}
          >
            Précédent
          </button>
          <button
            type="button"
            className="btn"
            onClick={() =>
              setStep(step.i + 1 < pages.length ? { k: 'page', i: step.i + 1 } : { k: 'review' })
            }
          >
            Suivant
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="homeq-patient bilan-theme">
      <h1 ref={top} tabIndex={-1}>
        Prêt à envoyer
      </h1>
      {missing > 0 ? (
        <p>
          Il manque {missing} réponse{missing > 1 ? 's' : ''}. Vous pouvez revenir en arrière pour compléter,
          ou envoyer quand même.
        </p>
      ) : (
        <p>Toutes les questions ont une réponse.</p>
      )}
      {err && (
        <p className="note err" role="alert">
          {err.text}
        </p>
      )}
      <div className="row homeq-nav">
        <button
          type="button"
          className="btn ghost"
          onClick={() => setStep({ k: 'page', i: pages.length - 1 })}
        >
          Précédent
        </button>
        {err?.retry ? (
          <button type="button" className="btn" disabled={busy} onClick={() => void send()}>
            Réessayer
          </button>
        ) : (
          !err && (
            <button type="button" className="btn" disabled={busy} onClick={() => void send()}>
              {busy ? 'Envoi…' : 'Envoyer à mon physiothérapeute'}
            </button>
          )
        )}
      </div>
    </main>
  );
}

function Shell({ title, text }: { title: string; text?: string }) {
  return (
    <main className="homeq-patient bilan-theme">
      <h1>{title}</h1>
      {text && <p>{text}</p>}
    </main>
  );
}
