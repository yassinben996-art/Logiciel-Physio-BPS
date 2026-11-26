// Appels à l'IA depuis le relais : la clé ne quitte jamais le serveur. Bascule dans l'ordre de AI_PROVIDERS
// sur quota épuisé (429), panne (5xx), délai dépassé ou réponse vide (spec IA §5.3).

export interface AiProvider {
  name: string;
  model: string;
  url: string;
  keyEnv: 'GROQ_API_KEY' | 'OPENROUTER_API_KEY';
}

/** Ordre de bascule (réglage : modifier cette liste suffit). */
export const AI_PROVIDERS: readonly AiProvider[] = [
  {
    name: 'Groq',
    model: 'openai/gpt-oss-120b',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    keyEnv: 'GROQ_API_KEY',
  },
  {
    name: 'Groq',
    model: 'llama-3.3-70b-versatile',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    keyEnv: 'GROQ_API_KEY',
  },
  {
    name: 'OpenRouter',
    model: 'openai/gpt-oss-120b:free',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    keyEnv: 'OPENROUTER_API_KEY',
  },
];

export type AiKeys = Partial<Record<AiProvider['keyEnv'], string>>;

async function tryProvider(
  p: AiProvider,
  key: string,
  system: string,
  user: string,
  f: typeof fetch,
  timeoutMs: number,
) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await f(p.url, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: p.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
    const text = j.choices?.[0]?.message?.content;
    return typeof text === 'string' && text.trim() ? text : null;
  } catch {
    return null; // réseau, délai dépassé, JSON illisible : fournisseur suivant
  } finally {
    clearTimeout(timer);
  }
}

export async function askAi(
  env: AiKeys,
  system: string,
  user: string,
  f: typeof fetch = fetch,
  timeoutMs = 20_000,
): Promise<{ provider: string; model: string; text: string } | null> {
  for (const p of AI_PROVIDERS) {
    const key = env[p.keyEnv];
    if (!key) continue;
    const text = await tryProvider(p, key, system, user, f, timeoutMs);
    if (text) return { provider: p.name, model: p.model, text };
  }
  return null;
}
