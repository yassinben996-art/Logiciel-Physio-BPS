// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { askAi } from '../relay/src/ai';
import { handle } from '../relay/src/handler';
import { MemoryStore } from '../relay/src/memoryStore';
import { ENV, call } from './relay.helpers';

const ok = (content: string) =>
  new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
const keys = { GROQ_API_KEY: 'g', OPENROUTER_API_KEY: 'o' };

/** fetch simulé : une réponse par appel, dans l'ordre. */
function seq(...rs: (Response | 'hang')[]) {
  const calls: { url: string; model: string; auth: string }[] = [];
  const f = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as { model: string };
    calls.push({
      url: String(url),
      model: body.model,
      auth: new Headers(init?.headers).get('authorization') ?? '',
    });
    const r = rs.shift() ?? new Response('', { status: 500 });
    if (r === 'hang')
      return new Promise<Response>((_, reject) =>
        init?.signal?.addEventListener('abort', () => reject(new DOMException('abort', 'AbortError'))),
      );
    return r;
  }) as unknown as typeof fetch;
  return { f, calls };
}

describe('askAi : bascule', () => {
  it('Groq répond', async () => {
    const { f, calls } = seq(ok('{"suggestions":[]}'));
    expect(await askAi(keys, 's', 'u', f)).toEqual({
      provider: 'Groq',
      model: 'openai/gpt-oss-120b',
      text: '{"suggestions":[]}',
    });
    expect(calls[0]!.url).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(calls[0]!.auth).toBe('Bearer g');
  });
  it('429 puis second modèle Groq', async () => {
    const { f } = seq(new Response('', { status: 429 }), ok('x'));
    expect((await askAi(keys, 's', 'u', f))?.model).toBe('llama-3.3-70b-versatile');
  });
  it('Groq en panne puis OpenRouter', async () => {
    const { f, calls } = seq(new Response('', { status: 500 }), new Response('', { status: 503 }), ok('x'));
    expect((await askAi(keys, 's', 'u', f))?.provider).toBe('OpenRouter');
    expect(calls[2]!.url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(calls[2]!.auth).toBe('Bearer o');
  });
  it('délai dépassé → bascule', async () => {
    const { f } = seq('hang', ok('x'));
    expect((await askAi(keys, 's', 'u', f, 50))?.model).toBe('llama-3.3-70b-versatile');
  });
  it('contenu vide → bascule ; tous en échec → null', async () => {
    expect((await askAi(keys, 's', 'u', seq(ok(''), ok('x')).f))?.model).toBe('llama-3.3-70b-versatile');
    expect(await askAi(keys, 's', 'u', seq().f)).toBeNull();
  });
  it('fournisseur sans clé sauté ; sans clé aucun appel', async () => {
    const a = seq(new Response('', { status: 500 }), new Response('', { status: 500 }), ok('x'));
    expect(await askAi({ GROQ_API_KEY: 'g' }, 's', 'u', a.f)).toBeNull();
    expect(a.calls).toHaveLength(2);
    const b = seq(ok('x'));
    expect(await askAi({}, 's', 'u', b.f)).toBeNull();
    expect(b.calls).toHaveLength(0);
  });
});

describe('POST /ai', () => {
  async function setup(fAi: typeof fetch) {
    const store = new MemoryStore();
    const env = { ...ENV, ...keys };
    let t = new Date('2026-11-26T10:00:00.000Z').getTime();
    const f = (async (input: RequestInfo | URL, init?: RequestInit) =>
      handle(new Request(String(input), init), env, store, () => new Date(t), fAi)) as typeof fetch;
    const r = await call(f, 'POST', '/setup', { setupCode: ENV.RELAY_SETUP_CODE, deviceName: 'T' });
    return { f, token: r.json.token as string, advance: (ms: number) => (t += ms) };
  }
  it('auth, réponse, 413, 503, limite horaire', async () => {
    const replies: Response[] = Array.from({ length: 40 }, () => ok('{"suggestions":[]}'));
    const fAi = (async () => replies.shift() ?? new Response('', { status: 500 })) as unknown as typeof fetch;
    const { f, token, advance } = await setup(fAi);
    expect((await call(f, 'POST', '/ai', { system: 's', user: 'u' })).status).toBe(401);
    const r = await call(f, 'POST', '/ai', { system: 's', user: 'u' }, token);
    expect(r.status).toBe(200);
    expect(r.json).toMatchObject({ provider: 'Groq', text: '{"suggestions":[]}' });
    expect((await call(f, 'POST', '/ai', { system: 's', user: 'x'.repeat(50000) }, token)).status).toBe(413);
    for (let i = 0; i < 29; i++) await call(f, 'POST', '/ai', { system: 's', user: 'u' }, token);
    expect((await call(f, 'POST', '/ai', { system: 's', user: 'u' }, token)).status).toBe(429);
    advance(61 * 60 * 1000);
    replies.length = 0;
    expect((await call(f, 'POST', '/ai', { system: 's', user: 'u' }, token)).status).toBe(503);
  });
});
