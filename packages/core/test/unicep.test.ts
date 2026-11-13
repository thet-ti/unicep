import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AllProvidersFailedError,
  CepNotFoundError,
  type CepProvider,
  InvalidCepError,
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

/** Never settles on its own; rejects with the abort reason when the signal fires. */
const untilAborted: Behavior = (_cep, { signal }) =>
  new Promise((_, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason));
  });

const down = () => Promise.reject(new ProviderError('x', 'down'));
const notFound = () => Promise.reject(new CepNotFoundError('01310100'));

describe('Unicep', () => {
  it('rejects empty and duplicate providers', () => {
    expect(() => new Unicep({ providers: [] })).toThrow(TypeError);
    const a = fakeProvider('a').provider;
    expect(() => new Unicep({ providers: [a, a] })).toThrow(/Duplicate/);
  });

  it('rejects invalid CEPs without calling providers', async () => {
    const { provider, lookup } = fakeProvider('a');
    const unicep = new Unicep({ providers: [provider] });
    await expect(unicep.lookup('123')).rejects.toBeInstanceOf(InvalidCepError);
    expect(lookup).not.toHaveBeenCalled();
  });

  it('returns the address stamped with the provider name and a normalized CEP argument', async () => {
    const { provider, lookup } = fakeProvider('a');
    const unicep = new Unicep({ providers: [provider] });
    await expect(unicep.lookup('01310-100')).resolves.toEqual({ ...ADDRESS, provider: 'a' });
    expect(lookup).toHaveBeenCalledWith(
      '01310100',
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it('falls back to the next provider on failure', async () => {
    const a = fakeProvider('a', down);
    const b = fakeProvider('b');
    const unicep = new Unicep({ providers: [a.provider, b.provider] });
    await expect(unicep.lookup('01310100')).resolves.toMatchObject({ provider: 'b' });
  });

  it('wraps unexpected provider errors as ProviderError and falls back', async () => {
    const a = fakeProvider('a', () => Promise.reject(new TypeError('boom')));
    const b = fakeProvider('b', down);
    const unicep = new Unicep({ providers: [a.provider, b.provider] });
    const error = await unicep.lookup('01310100').catch((e) => e);
    expect(error).toBeInstanceOf(AllProvidersFailedError);
    expect(error.errors[0]).toBeInstanceOf(ProviderError);
    expect(error.errors[0].cause).toBeInstanceOf(TypeError);
  });

  it('throws AllProvidersFailedError with one error per provider', async () => {
    const a = fakeProvider('a', down);
    const b = fakeProvider('b', down);
    const unicep = new Unicep({ providers: [a.provider, b.provider] });
    const error = await unicep.lookup('01310100').catch((e) => e);
    expect(error).toBeInstanceOf(AllProvidersFailedError);
    expect(error.errors).toHaveLength(2);
  });

  it('tries the next provider on "not found" and returns its answer', async () => {
    const a = fakeProvider('a', notFound);
    const b = fakeProvider('b');
    const unicep = new Unicep({ providers: [a.provider, b.provider] });
    await expect(unicep.lookup('01310100')).resolves.toMatchObject({ provider: 'b' });
  });

  it('throws CepNotFoundError when every provider says not found', async () => {
    const a = fakeProvider('a', notFound);
    const b = fakeProvider('b', notFound);
    const unicep = new Unicep({ providers: [a.provider, b.provider] });
    await expect(unicep.lookup('01310100')).rejects.toBeInstanceOf(CepNotFoundError);
  });

  it('throws AllProvidersFailedError when some say not found and others fail', async () => {
    const a = fakeProvider('a', notFound);
    const b = fakeProvider('b', down);
    const unicep = new Unicep({ providers: [a.provider, b.provider] });
    await expect(unicep.lookup('01310100')).rejects.toBeInstanceOf(AllProvidersFailedError);
  });

  it('times out slow providers and falls back', async () => {
    const a = fakeProvider('a', untilAborted);
    const b = fakeProvider('b');
    const unicep = new Unicep({ providers: [a.provider, b.provider], timeoutMs: 20 });
    await expect(unicep.lookup('01310100')).resolves.toMatchObject({ provider: 'b' });
  });

  describe('circuit breaker', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('opens after consecutive failures and skips the provider', async () => {
      const a = fakeProvider('a', down);
      const b = fakeProvider('b');
      const unicep = new Unicep({
        providers: [a.provider, b.provider],
        circuitBreaker: { failureThreshold: 2, resetTimeoutMs: 1_000 },
      });

      await unicep.lookup('01310100');
      await unicep.lookup('01310100');
      expect(a.lookup).toHaveBeenCalledTimes(2);
      expect(unicep.status()).toEqual([
        { name: 'a', circuit: 'open' },
        { name: 'b', circuit: 'closed' },
      ]);

      await unicep.lookup('01310100');
      expect(a.lookup).toHaveBeenCalledTimes(2);
    });

    it('does not count "not found" against the circuit', async () => {
      const a = fakeProvider('a', notFound);
      const b = fakeProvider('b');
      const unicep = new Unicep({
        providers: [a.provider, b.provider],
        circuitBreaker: { failureThreshold: 2 },
      });
      for (let i = 0; i < 5; i++) await unicep.lookup('01310100');
      expect(a.lookup).toHaveBeenCalledTimes(5);
      expect(unicep.status()[0]?.circuit).toBe('closed');
    });

    it('reports every provider as unavailable when all circuits are open', async () => {
      const a = fakeProvider('a', down);
      const unicep = new Unicep({
        providers: [a.provider],
        circuitBreaker: { failureThreshold: 1, resetTimeoutMs: 1_000 },
      });
      await expect(unicep.lookup('01310100')).rejects.toBeInstanceOf(AllProvidersFailedError);
      const error = await unicep.lookup('01310100').catch((e) => e);
      expect(error).toBeInstanceOf(AllProvidersFailedError);
      expect(error.errors[0].name).toBe('CircuitOpenError');
      expect(a.lookup).toHaveBeenCalledTimes(1);
    });

    it('closes again after a successful trial request', async () => {
      let healthy = false;
      const a = fakeProvider('a', () => (healthy ? Promise.resolve(ADDRESS) : down()));
      const b = fakeProvider('b');
      const unicep = new Unicep({
        providers: [a.provider, b.provider],
        circuitBreaker: { failureThreshold: 1, resetTimeoutMs: 1_000 },
      });

      await unicep.lookup('01310100');
      expect(unicep.status()[0]?.circuit).toBe('open');

      healthy = true;
      await vi.advanceTimersByTimeAsync(1_001);
      await expect(unicep.lookup('01310100')).resolves.toMatchObject({ provider: 'a' });
      expect(unicep.status()[0]?.circuit).toBe('closed');
    });
  });

  describe('cancellation', () => {
    it('rejects with the abort reason and does not count as a failure', async () => {
      const controller = new AbortController();
      const a = fakeProvider('a', untilAborted);
      const b = fakeProvider('b');
      const unicep = new Unicep({
        providers: [a.provider, b.provider],
        circuitBreaker: { failureThreshold: 1 },
      });

      const pending = unicep.lookup('01310100', { signal: controller.signal });
      controller.abort(new Error('cancelled'));
      await expect(pending).rejects.toThrow('cancelled');
      expect(b.lookup).not.toHaveBeenCalled();
      expect(unicep.status()[0]?.circuit).toBe('closed');
    });

    it('rejects immediately when the signal is already aborted', async () => {
      const a = fakeProvider('a');
      const unicep = new Unicep({ providers: [a.provider] });
      await expect(unicep.lookup('01310100', { signal: AbortSignal.abort() })).rejects.toThrow();
      expect(a.lookup).not.toHaveBeenCalled();
    });
  });
});
