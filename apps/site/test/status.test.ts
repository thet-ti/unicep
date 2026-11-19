import { describe, expect, it, vi } from 'vitest';
import { createStatusService } from '../src/lib/status';

const viaCepBody = {
  logradouro: 'Avenida Paulista',
  bairro: 'Bela Vista',
  localidade: 'São Paulo',
  uf: 'SP',
  ibge: '3550308',
};
const brasilApiBody = {
  street: 'Avenida Paulista',
  neighborhood: 'Bela Vista',
  city: 'São Paulo',
  state: 'SP',
  ibge: { city: '3550308' },
};
const awesomeBody = {
  address: 'Avenida Paulista',
  district: 'Bela Vista',
  city: 'São Paulo',
  state: 'SP',
  city_ibge: '3550308',
};

/** Fake network: every service answers, except hosts listed in `down`. */
function fakeFetch(down: string[] = []) {
  return vi.fn<typeof fetch>(async (input) => {
    const url = String(input);
    if (down.some((host) => url.includes(host))) return new Response('error', { status: 503 });
    const body = url.includes('brasilapi')
      ? brasilApiBody
      : url.includes('awesomeapi')
        ? awesomeBody
        : viaCepBody;
    return new Response(JSON.stringify(body), { status: 200 });
  });
}

describe('status service', () => {
  it('reports every provider online with its latency and circuit state', async () => {
    const { getStatus } = createStatusService({ fetch: fakeFetch() });
    const { providers, checkedAt } = await getStatus();

    expect(providers.map((p) => p.id)).toEqual(['viacep', 'brasilapi', 'opencep', 'awesomeapi']);
    for (const provider of providers.filter((p) => p.checked)) {
      expect(provider.online).toBe(true);
      expect(provider.latencyMs).toBeGreaterThanOrEqual(0);
      expect(provider.circuit).toBe('closed');
    }
    expect(new Date(checkedAt).toISOString()).toBe(checkedAt);
  });

  it('lists AwesomeAPI as requiring a key and does not probe it without one', async () => {
    const fetch = fakeFetch();
    const { getStatus } = createStatusService({ fetch });
    const { providers } = await getStatus();

    const awesome = providers.find((p) => p.id === 'awesomeapi');
    expect(awesome).toMatchObject({ requiresKey: true, checked: false, online: false });
    expect(providers.filter((p) => p.requiresKey).map((p) => p.id)).toEqual(['awesomeapi']);
    expect(fetch.mock.calls.some((call) => String(call[0]).includes('awesomeapi'))).toBe(false);
  });

  it('probes AwesomeAPI once a key is configured', async () => {
    const { getStatus } = createStatusService({ fetch: fakeFetch(), awesomeApiKey: 'k' });
    const awesome = (await getStatus()).providers.find((p) => p.id === 'awesomeapi');
    expect(awesome).toMatchObject({ requiresKey: true, checked: true, online: true });
  });

  it('sends the AwesomeAPI key only to AwesomeAPI', async () => {
    const fetch = fakeFetch();
    const { getStatus } = createStatusService({ fetch, awesomeApiKey: 'secret-key' });
    await getStatus();
    const withToken = fetch.mock.calls
      .map((call) => String(call[0]))
      .filter((u) => u.includes('token='));
    expect(withToken).toHaveLength(1);
    expect(withToken[0]).toContain('awesomeapi');
  });

  it('marks a failing provider offline without a latency', async () => {
    const { getStatus } = createStatusService({ fetch: fakeFetch(['brasilapi']) });
    const { providers } = await getStatus();
    const brasil = providers.find((p) => p.id === 'brasilapi');
    expect(brasil).toMatchObject({ online: false, latencyMs: null });
    expect(providers.filter((p) => p.online)).toHaveLength(2);
  });

  it('opens the circuit after repeated failures', async () => {
    let time = 0;
    const { getStatus } = createStatusService({
      fetch: fakeFetch(['viacep.com.br']),
      cacheMs: 1_000,
      now: () => time,
    });
    await getStatus();
    time += 1_001;
    const { providers } = await getStatus();
    expect(providers.find((p) => p.id === 'viacep')).toMatchObject({
      online: false,
      circuit: 'open',
    });
  });

  it('reuses the snapshot while fresh and refreshes after the cache expires', async () => {
    let time = 0;
    const fetch = fakeFetch();
    const { getStatus } = createStatusService({ fetch, cacheMs: 60_000, now: () => time });

    const first = await getStatus();
    const calls = fetch.mock.calls.length;
    time += 59_999;
    expect(await getStatus()).toBe(first);
    expect(fetch).toHaveBeenCalledTimes(calls);

    time += 2;
    const second = await getStatus();
    expect(second).not.toBe(first);
    expect(fetch.mock.calls.length).toBe(calls * 2);
  });

  it('shares one in-flight check between concurrent visitors', async () => {
    const fetch = fakeFetch();
    const { getStatus } = createStatusService({ fetch });
    const [a, b, c] = await Promise.all([getStatus(), getStatus(), getStatus()]);
    expect(a).toBe(b);
    expect(b).toBe(c);
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
