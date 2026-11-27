// Questionnaires proposés (pré-cochés) pour un envoi à domicile, d'après ce que contient le bilan.
import { QUESTIONNAIRES } from '../../questionnaires/public';
import type { ZoneDef } from '../content/types';
import type { Suggestion } from '../engine/rules';
import type { BilanState } from '../state/bilan';

export function proposeHomeQuestionnaires(
  z: ZoneDef,
  s: BilanState,
  suggestions: readonly Suggestion[],
): string[] {
  const want = new Set<string>([
    ...suggestions.filter((g) => g.kind === 'questionnaire').map((g) => g.target),
    ...z.rules.filter((r) => r.kind === 'questionnaire' && s.accepted.includes(r.id)).map((r) => r.target),
    ...(s.ai?.items ?? [])
      .filter((i) => i.kind === 'questionnaire' && i.status === 'added' && i.target)
      .map((i) => i.target!),
    ...(z.homeQuestionnaires ?? []),
  ]);
  return QUESTIONNAIRES.map((q) => q.id).filter((id) => want.has(id) && !(id in s.qResults));
}
