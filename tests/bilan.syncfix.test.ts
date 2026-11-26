import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { openBilanId } from '../src/bilan/ui/openBilan';
import { debounce } from '../src/bilan/sync/schedule';
import { syncOnce } from '../src/bilan/sync/engine';
import type { Vault } from '../src/bilan/storage/vault';

describe('corrections de la relecture (synchronisation)', () => {
  it('le workflow du relais échoue si le déploiement échoue (pipefail)', () => {
    const y = readFileSync(resolve(__dirname, '../.github/workflows/relay.yml'), 'utf8');
    expect(y).toMatch(/shell:\s*bash/);
  });

  it('bilan ouvert : aussi sur l’écran de confirmation de l’accueil patient', () => {
    const b = { id: 'b1' } as never;
    expect(openBilanId({ k: 'confirmPatient', bilan: b }, null)).toBe('b1');
    expect(openBilanId({ k: 'edit', bilan: b }, 'b2')).toBe('b2');
    expect(openBilanId({ k: 'patient', bilan: b }, null)).toBe('b1');
    expect(openBilanId({ k: 'list' }, 'b2')).toBeNull();
  });

  it('une erreur qui n’est pas réseau s’affiche comme erreur, pas « hors connexion »', async () => {
    const v = {
      getSyncConfig: async () => ({
        relayUrl: 'https://r.test',
        deviceId: 'd',
        deviceName: 'x',
        token: 't',
        cursor: 0,
      }),
      pending: async () => {
        throw new Error('déchiffrement impossible');
      },
    } as unknown as Vault;
    const f = (async () => new Response('{}')) as typeof fetch;
    expect((await syncOnce(v, { isOpen: () => false, f })).status).toBe('error');
    const down = (() => Promise.reject(new TypeError('Failed to fetch'))) as typeof fetch;
    const v2 = {
      ...v,
      pending: async () => [
        { id: 'a', meta: { iv: 'a', ct: 'b' }, data: { iv: 'a', ct: 'b' }, version: 0, deleted: false },
      ],
    } as unknown as Vault;
    expect((await syncOnce(v2, { isOpen: () => false, f: down })).status).toBe('offline');
  });

  it('synchronisations regroupées : une seule après une rafale de saisies', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const d = debounce(fn, 5000);
    for (let i = 0; i < 10; i++) {
      d();
      vi.advanceTimersByTime(1000);
    }
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(5000);
    expect(fn).toHaveBeenCalledTimes(1);
    d.cancel();
    vi.useRealTimers();
  });
});
