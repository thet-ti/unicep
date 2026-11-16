import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AllProvidersFailedError,
  CepNotFoundError,
  type CepProvider,
  type LookupContext,
  type ProviderAddress,
  ProviderError,
  Unicep,
} from '../src/index';

const ADDRESS: ProviderAddress = {
  cep: '01310100',
  street: 'Avenida Paulista',
  neighborhood: 'Bela Vista',
  city: 'São Paulo',
  state: 'SP',
};

type Behavior = (cep: string, context: LookupContext) => Promise<ProviderAddress>;

function fakeProvider(name: string, behavior: Behavior = async () => ADDRESS) {
  const lookup = vi.fn(behavior);
  const provider: CepProvider = { name, lookup };
  return { provider, lookup };
}

const down = () => Promise.reject(new ProviderError('x', 'down'));
const notFound = () => Promise.reject(new CepNotFoundError('01310100'));

/** Fails `failures` times, then succeeds. */
function flaky(failures: number): Behavior {
  let calls = 0;
  return () => (++calls <= failures ? down() : Promise.resolve(ADDRESS));
}

describe('retry', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('retries the same provider before falling back', async () => {
    const a = fakeProvider('a', flaky(1));
    const b = fakeProvider('b');
    const unicep = new Unicep({
      providers: [a.provider, b.provider],
      retry: { attempts: 1, delayMs: 100 },
    });

    const pending = unicep.lookup('01310100');
    await vi.advanceTimersByTimeAsync(100);
    await expect(pending).resolves.toMatchObject({ provider: 'a' });
    expect(a.lookup).toHaveBeenCalledTimes(2);
    expect(b.lookup).not.toHaveBeenCalled();
  });

  it('falls back after retries are exhausted, with exponential backoff', async () => {
    const a = fakeProvider('a', down);
    const b = fakeProvider('b');
    const unicep = new Unicep({
      providers: [a.provider, b.provider],
      retry: { attempts: 2, delayMs: 100 },
    });

    const pending = unicep.lookup('01310100');
    await vi.advanceTimersByTimeAsync(99);
    expect(a.lookup).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(a.lookup).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(199);
    expect(a.lookup).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(a.lookup).toHaveBeenCalledTimes(3);

    await expect(pending).resolves.toMatchObject({ provider: 'b' });
  });

  it('counts a provider that failed all attempts as a single failure for its circuit', async () => {
    const a = fakeProvider('a', down);
    const b = fakeProvider('b');
    const unicep = new Unicep({
      providers: [a.provider, b.provider],
      retry: { attempts: 1, delayMs: 10 },
      circuitBreaker: { failureThreshold: 2 },
    });

    const pending = unicep.lookup('01310100');
    await vi.advanceTimersByTimeAsync(10);
    await pending;
    expect(a.lookup).toHaveBeenCalledTimes(2);
    expect(unicep.status()[0]?.circuit).toBe('closed');
  });

  it('does not retry "not found"', async () => {
    const a = fakeProvider('a', notFound);
    const unicep = new Unicep({ providers: [a.provider], retry: { attempts: 3, delayMs: 10 } });
    await expect(unicep.lookup('01310100')).rejects.toBeInstanceOf(CepNotFoundError);
    expect(a.lookup).toHaveBeenCalledTimes(1);
  });

  it('stops waiting when the caller cancels during backoff', async () => {
    const a = fakeProvider('a', down);
    const b = fakeProvider('b');
    const unicep = new Unicep({
      providers: [a.provider, b.provider],
      retry: { attempts: 2, delayMs: 1_000 },
    });
    const controller = new AbortController();

    const pending = unicep.lookup('01310100', { signal: controller.signal });
    const assertion = expect(pending).rejects.toThrow('cancelled');
    await vi.advanceTimersByTimeAsync(10);
    controller.abort(new Error('cancelled'));
    await assertion;
    expect(a.lookup).toHaveBeenCalledTimes(1);
    expect(b.lookup).not.toHaveBeenCalled();
  });

  it('rejects invalid retry attempts', () => {
    const { provider } = fakeProvider('a');
    expect(() => new Unicep({ providers: [provider], retry: { attempts: -1 } })).toThrow(
      RangeError,
    );
    expect(() => new Unicep({ providers: [provider], retry: { attempts: 1.5 } })).toThrow(
      RangeError,
    );
  });

  it('reports AllProvidersFailedError when every attempt fails', async () => {
    const a = fakeProvider('a', down);
    const unicep = new Unicep({ providers: [a.provider], retry: { attempts: 1, delayMs: 10 } });
    const pending = unicep.lookup('01310100');
    const assertion = expect(pending).rejects.toBeInstanceOf(AllProvidersFailedError);
    await vi.advanceTimersByTimeAsync(10);
    await assertion;
  });
});

describe('cache', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('is disabled by default', async () => {
    const a = fakeProvider('a');
    const unicep = new Unicep({ providers: [a.provider] });
    await unicep.lookup('01310100');
    await unicep.lookup('01310100');
    expect(a.lookup).toHaveBeenCalledTimes(2);
  });

  it('serves repeated lookups from memory, masked or not', async () => {
    const a = fakeProvider('a');
    const unicep = new Unicep({ providers: [a.provider], cache: {} });
    const first = await unicep.lookup('01310100');
    const second = await unicep.lookup('01310-100');
    expect(second).toEqual(first);
    expect(a.lookup).toHaveBeenCalledTimes(1);
  });

  it('keeps the provider that originally answered', async () => {
    const a = fakeProvider('a', down);
    const b = fakeProvider('b');
    const unicep = new Unicep({ providers: [a.provider, b.provider], cache: {} });
    await unicep.lookup('01310100');
    await expect(unicep.lookup('01310100')).resolves.toMatchObject({ provider: 'b' });
    expect(a.lookup).toHaveBeenCalledTimes(1);
  });

  it('returns copies so callers cannot corrupt the cache', async () => {
    const a = fakeProvider('a');
    const unicep = new Unicep({ providers: [a.provider], cache: {} });
    const first = await unicep.lookup('01310100');
    first.city = 'Changed';
    const second = await unicep.lookup('01310100');
    second.city = 'Changed again';
    await expect(unicep.lookup('01310100')).resolves.toMatchObject({ city: 'São Paulo' });
  });

  it('expires entries after the ttl', async () => {
    const a = fakeProvider('a');
    const unicep = new Unicep({ providers: [a.provider], cache: { ttlMs: 1_000 } });
    await unicep.lookup('01310100');
    await vi.advanceTimersByTimeAsync(999);
    await unicep.lookup('01310100');
    expect(a.lookup).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(2);
    await unicep.lookup('01310100');
    expect(a.lookup).toHaveBeenCalledTimes(2);
  });

  it('evicts the least recently used entry beyond maxEntries', async () => {
    const a = fakeProvider('a', async (cep) => ({ ...ADDRESS, cep }));
    const unicep = new Unicep({ providers: [a.provider], cache: { maxEntries: 2 } });
    await unicep.lookup('00000001');
    await unicep.lookup('00000002');
    await unicep.lookup('00000001'); // refreshes 00000001
    await unicep.lookup('00000003'); // evicts 00000002
    expect(a.lookup).toHaveBeenCalledTimes(3);

    await unicep.lookup('00000001');
    await unicep.lookup('00000003');
    expect(a.lookup).toHaveBeenCalledTimes(3);
    await unicep.lookup('00000002');
    expect(a.lookup).toHaveBeenCalledTimes(4);
  });

  it('does not cache failures or "not found"', async () => {
    const a = fakeProvider('a', notFound);
    const unicep = new Unicep({ providers: [a.provider], cache: {} });
    await expect(unicep.lookup('01310100')).rejects.toBeInstanceOf(CepNotFoundError);
    await expect(unicep.lookup('01310100')).rejects.toBeInstanceOf(CepNotFoundError);
    expect(a.lookup).toHaveBeenCalledTimes(2);
  });

  it('can be cleared', async () => {
    const a = fakeProvider('a');
    const unicep = new Unicep({ providers: [a.provider], cache: {} });
    await unicep.lookup('01310100');
    unicep.clearCache();
    await unicep.lookup('01310100');
    expect(a.lookup).toHaveBeenCalledTimes(2);
  });

  it('clearCache is a no-op when the cache is disabled', () => {
    const { provider } = fakeProvider('a');
    expect(() => new Unicep({ providers: [provider] }).clearCache()).not.toThrow();
  });

  it('rejects invalid cache options', () => {
    const { provider } = fakeProvider('a');
    expect(() => new Unicep({ providers: [provider], cache: { ttlMs: 0 } })).toThrow(RangeError);
    expect(() => new Unicep({ providers: [provider], cache: { maxEntries: 0 } })).toThrow(
      RangeError,
    );
  });
});
