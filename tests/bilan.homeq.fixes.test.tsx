// Corrections de la relecture finale (questionnaires à domicile).
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useRef, type MutableRefObject } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryStore } from '../relay/src/memoryStore';
import { SHOULDER } from '../src/bilan/content';
import { evaluate } from '../src/bilan/engine/rules';
import { homeLink, newHomeKey, parseHomeLink, sealAnswers, ticketHash } from '../src/bilan/homeq/link';
import { bilanReducer, emptyBilan, type BilanAction, type BilanState } from '../src/bilan/state/bilan';
import { createVault } from '../src/bilan/storage/vault';
import { homeSubmit, relayApi, type SyncConfig } from '../src/bilan/sync/api';
import { activateSync, createPairingCode, linkDevice, syncOnce } from '../src/bilan/sync/engine';
import BilanApp from '../src/bilan/ui/BilanApp';
import { HomeQAnswered } from '../src/bilan/homeq/create';
import HomeQPanel from '../src/bilan/ui/HomeQPanel';
import PatientHomeQ from '../src/bilan/ui/PatientHomeQ';
import { BASE, call, ENV, fetchFor } from './relay.helpers';

const req = async (ticket = 'T1') => ({
  ticket,
  hash: await ticketHash(ticket),
  key: newHomeKey(),
  ids: ['tsk'],
  createdAt: '2026-11-27T10:00:00.000Z',
  expiresAt: '2099-12-11T10:00:00.000Z',
});

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

describe('I1 : réponses injectées dans le bilan ouvert, sans le remonter', () => {
  it('l’écran reçoit l’action, la section ouverte reste ouverte, onChange porte les réponses', async () => {
    const r = await req();
    const initial: BilanState = { ...emptyBilan('shoulder'), homeQ: r };
    const onChange = vi.fn();
    let inject: MutableRefObject<((a: BilanAction) => void) | null> | null = null;
    function Host() {
      const ref = useRef<((a: BilanAction) => void) | null>(null);
      inject = ref;
      return <BilanApp initial={initial} onChange={onChange} injectRef={ref} />;
    }
    const { container } = render(<Host />);
    const sec = container.querySelectorAll('details.bilan-sec')[1] as HTMLDetailsElement;
    sec.open = true;
    act(() =>
      inject!.current!({ type: 'homeQReceived', hash: r.hash, answers: { tsk: { t1: 2 } }, at: 'x' }),
    );
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(onChange.mock.lastCall![0].qResults.tsk.answers).toEqual({ t1: 2 });
    expect((container.querySelectorAll('details.bilan-sec')[1] as HTMLDetailsElement).open).toBe(true);
  });
});

describe('I2 : un autre appareil a relevé pendant que le bilan est ouvert ici', () => {
  it('fusion homeQMerge dans la saisie ouverte', async () => {
    const r = await req();
    let s = bilanReducer(emptyBilan('shoulder'), { type: 'homeQCreate', req: r });
    s = bilanReducer(s, { type: 'note', key: 'anamnese.notes', value: 'saisie ouverte' });
    const merged = bilanReducer(s, {
      type: 'homeQMerge',
      results: { tsk: { answers: { t1: 1 }, at: '2026-11-28' } },
      doneHash: r.hash,
    });
    expect(merged.homeQ).toBeNull();
    expect(merged.qResults.tsk!.answers).toEqual({ t1: 1 });
    expect(merged.notes['anamnese.notes']).toBe('saisie ouverte');
    // Rien de nouveau : même état (pas de modification fantôme).
    expect(bilanReducer(merged, { type: 'homeQMerge', results: merged.qResults })).toBe(merged);
  });
  it('synchronisation : A (bilan ouvert) reçoit la fusion quand B a relevé', async () => {
    const store = new MemoryStore();
    const f = fetchFor(store);
    const A = await createVault('123456', { idb: new IDBFactory() });
    const B = await createVault('654321', { idb: new IDBFactory() });
    await activateSync(A, BASE, ENV.RELAY_SETUP_CODE, 'Tablette', f);
    const cfg = (await A.getSyncConfig<SyncConfig>())!;
    const t = await relayApi(cfg.relayUrl, cfg.token, f).homeTicket();
    const key = newHomeKey();
    const b = bilanReducer(emptyBilan('shoulder'), {
      type: 'homeQCreate',
      req: {
        ticket: t.ticket,
        hash: await ticketHash(t.ticket),
        key,
        ids: ['tsk'],
        createdAt: 'x',
        expiresAt: t.expiresAt,
      },
    });
    await A.save(b);
    await syncOnce(A, { isOpen: () => false, f });
    const { code } = await createPairingCode(A, f);
    await linkDevice(B, BASE, code, 'Téléphone', f);
    await syncOnce(B, { isOpen: () => false, f });
    await homeSubmit(BASE, t.ticket, await sealAnswers(key, { tsk: { tsk1: 4 } }), f);
    expect((await syncOnce(B, { isOpen: () => false, f })).homeReceived).toBe(1);
    const applyOpen = vi.fn(async () => true);
    await syncOnce(A, { isOpen: (id) => id === b.id, f, applyOpen });
    expect(applyOpen).toHaveBeenCalledWith(
      b.id,
      expect.objectContaining({ type: 'homeQMerge', doneHash: b.homeQ!.hash }),
    );
    const action = (applyOpen.mock.calls[0] as unknown as [string, { results: BilanState['qResults'] }])[1];
    expect(action.results.tsk!.answers).toEqual({ tsk1: 4 });
  }, 30000);
});

describe('I3 : nouvel envoi = l’ancien lien est révoqué', () => {
  it('relais : révocation sans dépôt → l’ancien lien répond 410 ; avec dépôt → 409, dépôt gardé', async () => {
    const store = new MemoryStore();
    const f = fetchFor(store);
    const a = await call(f, 'POST', '/setup', { setupCode: ENV.RELAY_SETUP_CODE, deviceName: 'A' });
    const tok = a.json.token as string;
    const box = { iv: 'aXY=', ct: 'Y3Q=' };
    const t1 = (await call(f, 'POST', '/q/ticket', {}, tok)).json.ticket as string;
    expect((await call(f, 'POST', `/q/revoke/${await ticketHash(t1)}`, {}, tok)).status).toBe(204);
    expect((await call(f, 'POST', '/q/submit', { ticket: t1, box })).status).toBe(410);
    const t2 = (await call(f, 'POST', '/q/ticket', {}, tok)).json.ticket as string;
    await call(f, 'POST', '/q/submit', { ticket: t2, box });
    expect((await call(f, 'POST', `/q/revoke/${await ticketHash(t2)}`, {}, tok)).status).toBe(409);
    expect((await call(f, 'GET', '/q/inbox', undefined, tok)).json.hashes).toHaveLength(1);
    expect((await call(f, 'POST', '/q/revoke/zz', {}, tok)).status).toBe(400);
  });
  it('écran : « Nouvel envoi » passe l’empreinte de l’ancien lien ; déjà répondu → message', async () => {
    const r = await req();
    const s = { ...emptyBilan('shoulder'), homeQ: r };
    const create = vi.fn(async () => {
      throw new HomeQAnswered();
    });
    render(
      <HomeQPanel
        zone={SHOULDER}
        state={s}
        dispatch={vi.fn()}
        suggestions={evaluate(SHOULDER, s)}
        homeQ={{ create }}
        base="https://x/"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Nouvel envoi' }));
    fireEvent.click(screen.getByRole('button', { name: 'Créer le QR code' }));
    await waitFor(() => expect(create).toHaveBeenCalledWith(['quickdash', 'spadi'], r.hash));
    expect(
      await screen.findByText(
        'Le patient a déjà répondu : ses réponses arrivent à la prochaine synchronisation.',
      ),
    ).toBeInTheDocument();
  });
});

describe('I4 : lien expiré signalé dès l’ouverture', () => {
  it('la date limite voyage dans le lien', () => {
    const key = newHomeKey();
    const url = homeLink('https://x/', {
      ticket: 't',
      key,
      ids: ['tsk'],
      expiresAt: '2026-12-11T10:00:00.000Z',
    });
    expect(url).toBe(`https://x/#/q?t=t&k=${key}&q=tsk&e=1796983200`);
    expect(parseHomeLink(url.slice(url.indexOf('#')))?.expiresAt).toBe('2026-12-11T10:00:00.000Z');
    expect(parseHomeLink(`#/q?t=t&k=${key}&q=tsk`)?.expiresAt).toBeUndefined();
  });
  it('page du patient : lien expiré → message tout de suite', async () => {
    const key = newHomeKey();
    render(
      <PatientHomeQ hash={`#/q?t=t&k=${key}&q=tsk&e=1600000000`} relayUrl="https://r" submit={vi.fn()} />,
    );
    expect(
      await screen.findByText('Ce lien n’est plus valable. Demandez-en un nouveau à votre physiothérapeute.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Commencer' })).not.toBeInTheDocument();
  });
});
