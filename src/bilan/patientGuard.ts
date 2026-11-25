// Garde du mode patient, en mémoire seulement (aucun stockage) : tant qu'il est actif, l'app ne montre
// que l'accueil ou l'écran du PIN, quelle que soit l'adresse. Les autres onglets se verrouillent.

let locked = false;
const listeners = new Set<() => void>();
const remote = new Set<() => void>();
const channel: BroadcastChannel | null =
  typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('bilan-tabs');
if (channel) channel.onmessage = (e: MessageEvent) => e.data === 'lock' && remote.forEach((f) => f());

export const isPatientLocked = (): boolean => locked;

export function setPatientLocked(v: boolean): void {
  if (v === locked) return;
  locked = v;
  if (v) channel?.postMessage('lock');
  listeners.forEach((f) => f());
}

export function onPatientLockChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Un autre onglet a lancé le mode patient : se verrouiller. */
export function onRemoteLock(fn: () => void): () => void {
  remote.add(fn);
  return () => remote.delete(fn);
}

/** Pour les tests : simule le message d'un autre onglet. */
export function simulateRemoteLock(): void {
  remote.forEach((f) => f());
}
