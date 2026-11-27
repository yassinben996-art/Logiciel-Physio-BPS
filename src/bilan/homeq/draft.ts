// Brouillon du patient sur son propre téléphone (IndexedDB ; jamais localStorage), par ticket.
// Si IndexedDB est indisponible (navigation privée…), le brouillon ne vit qu'en mémoire.
import type { HomeAnswers } from './link';

export interface HomeDraft {
  answers: HomeAnswers;
  sent?: boolean;
}

const DB = 'bilan-homeq';
const STORE = 'drafts';
const memory = new Map<string, HomeDraft>();

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error ?? new Error('IndexedDB'));
  });
}

async function run<T>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const d = await db();
  try {
    return await new Promise<T>((resolve, reject) => {
      const t = d.transaction(STORE, mode);
      const r = f(t.objectStore(STORE));
      t.oncomplete = () => resolve(r.result as T);
      t.onerror = () => reject(t.error ?? new Error('IndexedDB'));
    });
  } finally {
    d.close();
  }
}

export async function loadDraft(ticket: string): Promise<HomeDraft | null> {
  try {
    return (await run<HomeDraft | undefined>('readonly', (s) => s.get(ticket))) ?? null;
  } catch {
    return memory.get(ticket) ?? null;
  }
}

/** Écritures l'une après l'autre : la dernière réponse donnée est toujours la dernière enregistrée. */
let queue: Promise<unknown> = Promise.resolve();

export function saveDraft(ticket: string, d: HomeDraft): Promise<void> {
  const p = queue.then(() => write(ticket, d));
  queue = p;
  return p;
}

async function write(ticket: string, d: HomeDraft): Promise<void> {
  try {
    await run('readwrite', (s) => s.put(d, ticket));
  } catch {
    memory.set(ticket, d); // IndexedDB indisponible : mémoire seulement
  }
}
