// « Demander à l'IA » : aperçu modifiable, envoi au relais, suggestions marquées « IA · non sourcé ».
import { useRef, useState, type Dispatch } from 'react';
import { QUESTIONNAIRES } from '@q';
import { parseAiResponse } from '../ai/response';
import { buildSummary } from '../ai/summary';
import { INTAKE } from '../content/intake';
import type { ZoneDef } from '../content/types';
import { ignoredAiLabels, type BilanAction, type BilanState } from '../state/bilan';
import { RelayError } from '../sync/api';
import { goToField } from './dom';
import TextPreview from './TextPreview';

export interface AiAsk {
  ask: (user: string) => Promise<{ provider: string; model: string; text: string }>;
}

const KIND_LABEL = {
  hypothese: 'Hypothèse',
  test: 'Test',
  questionnaire: 'Questionnaire',
  drapeau: 'Drapeau à vérifier',
};

function errorText(e: unknown): string {
  if (e instanceof RelayError) {
    if (e.status === 429) return 'Limite atteinte : réessaie dans une heure.';
    if (e.status === 503 || e.status >= 500)
      return 'IA indisponible pour le moment, seules les règles sont actives';
    return 'Erreur de l’IA';
  }
  if (e instanceof TypeError) return 'Hors connexion';
  return e instanceof Error ? e.message : 'Erreur de l’IA';
}

interface Props {
  zone: ZoneDef;
  state: BilanState;
  dispatch: Dispatch<BilanAction>;
  ai: AiAsk | null | undefined;
}

export default function AiPanel({ zone, state: s, dispatch, ai }: Props) {
  const [mode, setMode] = useState<'idle' | 'preview' | 'waiting'>('idle');
  const [err, setErr] = useState<string | null>(null);
  const request = useRef(0);

  if (!ai)
    return (
      <div className="ai-panel">
        <h3>IA</h3>
        <p className="note">Active la synchronisation pour utiliser l’IA.</p>
      </div>
    );

  const send = async (text: string) => {
    const n = ++request.current;
    setErr(null);
    setMode('waiting');
    try {
      const r = await ai.ask(text);
      if (n !== request.current) return; // annulé entre-temps
      const items = parseAiResponse(
        r.text,
        zone,
        QUESTIONNAIRES.map((q) => ({ id: q.id, name: q.name })),
      );
      dispatch({ type: 'aiResult', provider: r.provider, model: r.model, items });
    } catch (e) {
      if (n === request.current) setErr(errorText(e));
    } finally {
      if (n === request.current) setMode('idle');
    }
  };

  const items = s.ai?.items ?? [];
  return (
    <div className="ai-panel">
      <h3>IA</h3>
      {mode === 'idle' && (
        <button type="button" className="btn small" onClick={() => setMode('preview')}>
          Demander à l’IA
        </button>
      )}
      {mode === 'preview' && (
        <TextPreview
          title="Voici ce qui sera envoyé"
          note="Sans nom ni date : vérifie qu’aucune information identifiante n’a échappé au nettoyage."
          initial={buildSummary(zone, s, INTAKE, ignoredAiLabels(s))}
          confirmLabel="Envoyer"
          onConfirm={(t) => void send(t)}
          onCancel={() => setMode('idle')}
        />
      )}
      {mode === 'waiting' && (
        <div className="row">
          <p className="note" role="status">
            L’IA réfléchit…
          </p>
          <button
            type="button"
            className="btn small ghost"
            onClick={() => {
              request.current++;
              setMode('idle');
            }}
          >
            Annuler
          </button>
        </div>
      )}
      {err && (
        <p className="note err" role="alert">
          {err}
        </p>
      )}
      {s.ai && items.length > 0 && (
        <>
          <p className="note">
            Suggestions de {s.ai.provider} · {s.ai.model}
          </p>
          <ul className="ai-items">
            {items.map((i) => (
              <li key={i.id} className={`ai-item s-${i.status}`}>
                <p className="eyebrow">{KIND_LABEL[i.kind]}</p>
                <p className="bilan-sugg-label">{i.label}</p>
                {i.reason && <p className="note">{i.reason}</p>}
                <p className="bilan-prov">IA · non sourcé</p>
                {i.status === 'pending' ? (
                  <div className="row">
                    {i.target ? (
                      <button
                        type="button"
                        className="btn small"
                        aria-label={`Ajouter ${i.label}`}
                        onClick={() => {
                          dispatch({ type: 'aiStatus', id: i.id, status: 'added' });
                          if (i.kind === 'test') goToField(i.target!);
                        }}
                      >
                        Ajouter
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn small"
                        aria-label={`Noter ${i.label}`}
                        onClick={() => dispatch({ type: 'aiStatus', id: i.id, status: 'noted' })}
                      >
                        Noter
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn small ghost"
                      aria-label={`Ignorer ${i.label}`}
                      onClick={() => dispatch({ type: 'aiStatus', id: i.id, status: 'ignored' })}
                    >
                      Ignorer
                    </button>
                  </div>
                ) : (
                  <p className="note">
                    {i.status === 'added'
                      ? 'Ajouté'
                      : i.status === 'noted'
                        ? 'Noté dans le raisonnement'
                        : 'Ignoré'}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
