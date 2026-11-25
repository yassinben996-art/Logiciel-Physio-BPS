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
  db.exec(readFileSync(resolve(__dirname, '../relay/migrations/0001_init.sql'), 'utf8'));
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
  });
  return { prepare: (sql: string) => stmt(sql) };
}

describe.skipIf(!sqlite)('stockage D1 (SQLite de Node)', () => {
  storeContract(() => new D1Store(fakeD1()));
});
