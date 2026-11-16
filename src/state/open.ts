import { ranks } from '../engine/analyze';
import type { Analysis, DomainId } from '../engine/types';
import type { OpenMap } from './reducer';

/** Une branche est ouverte si l'utilisateur l'a choisi, sinon par défaut pour les 2 premiers prioritaires. */
export function isOpen(id: DomainId, X: Analysis, open: OpenMap): boolean {
  const r = ranks(X)[id];
  return open[id] ?? (r !== undefined && r <= 2);
}
