// Bilan « ouvert » pour la synchronisation : jamais remplacé tant qu'il est à l'écran (y compris la
// confirmation de l'accueil patient, qui garde le bilan en mémoire).
import type { BilanState } from '../state/bilan';

type ScreenLike = { k: string; bilan?: BilanState };

export function openBilanId(screen: ScreenLike, currentId: string | null): string | null {
  if (screen.k !== 'edit' && screen.k !== 'patient' && screen.k !== 'confirmPatient') return null;
  return currentId ?? screen.bilan?.id ?? null;
}
