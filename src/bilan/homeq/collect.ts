// Relève des réponses des questionnaires à domicile, pendant la synchronisation. Le dépôt n'est supprimé du
// relais qu'une fois les réponses enregistrées : en cas d'échec, le bail expire et un appareil le relèvera.
import { bilanReducer, type BilanAction } from '../state/bilan';
import type { Vault } from '../storage/vault';
import type { RelayApi } from '../sync/api';
import { openAnswers, type HomeAnswers } from './link';

export interface CollectOpts {
  isOpen: (id: string) => boolean;
  /** Bilan ouvert à l'écran : la saisie ouverte reçoit l'action. Vrai une fois enregistré. */
  applyOpen?: (id: string, a: BilanAction) => Promise<boolean>;
}

/** Ne garde que les questionnaires demandés et des valeurs numériques (la boîte vient d'un téléphone inconnu). */
function clean(a: HomeAnswers, ids: readonly string[]): HomeAnswers {
  const out: HomeAnswers = {};
  if (!a || typeof a !== 'object') return out;
  for (const id of ids) {
    const r = (a as Record<string, unknown>)[id];
    if (!r || typeof r !== 'object') continue;
    const items = Object.entries(r as Record<string, unknown>).filter(
      (e): e is [string, number] => typeof e[1] === 'number' && Number.isFinite(e[1]) && e[0].length <= 64,
    );
    if (items.length) out[id] = Object.fromEntries(items.slice(0, 200));
  }
  return out;
}

export async function collectHomeAnswers(v: Vault, api: RelayApi, opts: CollectOpts): Promise<number> {
  const hashes = await api.homeInbox();
  if (!hashes.length) return 0;
  const metas = await v.list();
  let done = 0;
  for (const hash of hashes) {
    // Une empreinte qu'aucun bilan n'attend (lien remplacé, bilan pas encore reçu) reste sur le relais.
    const m = metas.find((x) => x.homeQHash === hash && !x.conflictOf);
    if (!m) continue;
    const b = await v.load(m.id);
    if (!b?.homeQ || b.homeQ.hash !== hash) continue;
    const box = await api.homeClaim(hash);
    if (!box) continue; // relevé par un autre appareil
    let answers: HomeAnswers;
    try {
      answers = clean(await openAnswers(b.homeQ.key, box), b.homeQ.ids);
    } catch {
      continue; // illisible : laissé tel quel
    }
    const action: BilanAction = { type: 'homeQReceived', hash, answers, at: new Date().toISOString() };
    let ok: boolean;
    if (opts.isOpen(m.id)) ok = opts.applyOpen ? await opts.applyOpen(m.id, action) : false;
    else {
      await v.save(bilanReducer(b, action));
      ok = true;
    }
    if (!ok) continue;
    await api.homeDone(hash);
    done++;
  }
  return done;
}
