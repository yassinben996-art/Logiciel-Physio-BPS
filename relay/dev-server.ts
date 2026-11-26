// Relais local pour le développement : même logique qu'en production, stockage en mémoire.
// Lancement : npm run relay:dev (http://localhost:8787, code d'installation « dev »).
import { createServer } from 'node:http';
import { handle } from './src/handler';
import { MemoryStore } from './src/memoryStore';

const store = new MemoryStore();
const MOCK_AI = process.env.MOCK_AI === '1';
const env = {
  RELAY_SETUP_CODE: 'dev',
  ALLOWED_ORIGIN: 'http://localhost:5173',
  ...(MOCK_AI ? { GROQ_API_KEY: 'simulée' } : {}),
};
// IA simulée (MOCK_AI=1) : répond sans aucun appel externe.
const mockAi = (async () =>
  new Response(
    JSON.stringify({
      choices: [
        {
          message: {
            content: JSON.stringify({
              suggestions: [
                {
                  type: 'hypothese',
                  label: 'Tendinopathie de la coiffe des rotateurs',
                  reason: 'Douleur à l’élévation, sans traumatisme',
                },
                { type: 'test', label: 'Neer', reason: 'Rechercher un conflit sous-acromial' },
              ],
            }),
          },
        },
      ],
    }),
    { status: 200 },
  )) as unknown as typeof fetch;
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
    undefined,
    MOCK_AI ? mockAi : undefined,
  );
  res.writeHead(r.status, Object.fromEntries(r.headers.entries()));
  res.end(Buffer.from(await r.arrayBuffer()));
}).listen(PORT, () =>
  console.log(
    `Relais local : http://localhost:${PORT} (code d'installation : dev${MOCK_AI ? ', IA simulée' : ''})`,
  ),
);
