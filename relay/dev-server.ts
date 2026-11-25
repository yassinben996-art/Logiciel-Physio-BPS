// Relais local pour le développement : même logique qu'en production, stockage en mémoire.
// Lancement : npm run relay:dev (http://localhost:8787, code d'installation « dev »).
import { createServer } from 'node:http';
import { handle } from './src/handler';
import { MemoryStore } from './src/memoryStore';

const store = new MemoryStore();
const env = { RELAY_SETUP_CODE: 'dev', ALLOWED_ORIGIN: 'http://localhost:5173' };
const PORT = Number(process.env.PORT ?? 8787);

createServer(async (req, res) => {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
  const r = await handle(
    new Request(`http://localhost:${PORT}${req.url ?? '/'}`, {
      method: req.method,
      headers,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
    }),
    env,
    store,
  );
  res.writeHead(r.status, Object.fromEntries(r.headers.entries()));
  res.end(Buffer.from(await r.arrayBuffer()));
}).listen(PORT, () => console.log(`Relais local : http://localhost:${PORT} (code d'installation : dev)`));
