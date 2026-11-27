// @vitest-environment node
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe } from 'vitest';
import { D1Store, type D1Like } from '../relay/src/d1Store';
import { storeContract } from './relay.helpers';

const require = createRequire(import.meta.url);
let sqlite: typeof import('node:sqlite') | null = null;
try {
  sqlite = require('node:sqlite') as typeof import('node:sqlite');
} catch {
  sqlite = null;
}

/** Faux D1 : l'API de D1 (prepare/bind/first/all/run) au-dessus de SQLite de Node. */
function fakeD1(): D1Like {
  const db = new sqlite!.DatabaseSync(':memory:');
  for (const m of ['0001_init.sql', '0002_ai.sql', '0003_home_q.sql'])
    db.exec(readFileSync(resolve(__dirname, '../relay/migrations', m), 'utf8'));
  const stmt = (sql: string, args: unknown[] = []) => ({
    bind: (...a: unknown[]) => stmt(sql, a),
    async first<T>() {
      return (db.prepare(sql).get(...(args as never[])) as T | undefined) ?? null;
    },
    async all<T>() {
      return { results: db.prepare(sql).all(...(args as never[])) as T[] };
    },
    async run() {
      const r = db.prepare(sql).run(...(args as never[]));
      return { meta: { changes: Number(r.changes) } };
    },
    /** Exécution dans un lot : résultats pour un SELECT, nombre de lignes modifiées sinon. */
    exec() {
      if (/^\s*SELECT/i.test(sql))
        return { results: db.prepare(sql).all(...(args as never[])), meta: { changes: 0 } };
      const r = db.prepare(sql).run(...(args as never[]));
      return { meta: { changes: Number(r.changes) } };
    },
  });
  return {
    prepare: (sql: string) => stmt(sql),
    // D1 exécute un lot comme une seule transaction.
    async batch(stmts) {
      db.exec('BEGIN');
      try {
        const out = [];
        for (const s of stmts)
          out.push((s as unknown as { exec(): { results?: unknown[]; meta: { changes: number } } }).exec());
        db.exec('COMMIT');
        return out;
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
  };
}

describe.skipIf(!sqlite)('stockage D1 (SQLite de Node)', () => {
  storeContract(() => new D1Store(fakeD1()));
});

describe.skipIf(!sqlite)('D1 : séquence et écriture dans la même transaction', () => {
  it('putRecord passe par un seul lot (batch), sans aller-retour séparé pour la séquence', async () => {
    const d1 = fakeD1();
    const calls: string[] = [];
    const spy: D1Like = {
      prepare: (sql) => {
        const s = d1.prepare(sql);
        const wrap = (x: ReturnType<D1Like['prepare']>): ReturnType<D1Like['prepare']> => ({
          bind: (...a) => wrap(x.bind(...a)),
          first: () => (calls.push('first'), x.first()),
          all: () => (calls.push('all'), x.all()),
          run: () => (calls.push('run'), x.run()),
          ...{ exec: () => (x as unknown as { exec(): unknown }).exec() },
        });
        return wrap(s);
      },
      batch: (stmts) => (calls.push('batch'), d1.batch(stmts)),
    };
    const s = new D1Store(spy);
    calls.length = 0;
    expect(await s.putRecord({ id: 'a', meta: 'm', data: 'd', version: 1, deleted: false })).toBe(1);
    expect(calls[0]).toBe('batch');
    expect(calls.filter((c) => c === 'first')).toEqual([]);
  });
});
