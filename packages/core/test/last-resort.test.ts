import { describe, expect, it, vi } from 'vitest';
import {
  AllProvidersFailedError,
  CepNotFoundError,
  type CepProvider,
  CircuitOpenError,
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

function fakeProvider(name: string, initial: Behavior = async () => ADDRESS) {
  let behavior = initial;
  const lookup = vi.fn<Behavior>((cep, context) => behavior(cep, context));
  const provider: CepProvider = { name, lookup };
  return {
    provider,
    lookup,
    set: (next: Behavior) => {
      behavior = next;
    },
  };
}

const down: Behavior = () => Promise.reject(new ProviderError('x', 'down'));
const notFound: Behavior = () => Promise.reject(new CepNotFoundError('01310100'));

/** Opens the circuit of every provider by failing `threshold` lookups. */
async function openCircuits(unicep: Unicep, threshold: number) {
  for (let i = 0; i < threshold; i++) await unicep.lookup('01310100').catch(() => {});
}

describe('circuitBreaker.lastResort', () => {
  it('fails fast on open circuits by default', async () => {
    const a = fakeProvider('a', down);
    const unicep = new Unicep({ providers: [a.provider], circuitBreaker: { failureThreshold: 2 } });
    await openCircuits(unicep, 2);
    expect(unicep.status()[0]?.circuit).toBe('open');

    a.set(async () => ADDRESS); // the service is back, but the circuit is still open
    const error = await unicep.lookup('01310100').catch((e) => e);
    expect(error).toBeInstanceOf(AllProvidersFailedError);
    expect(error.errors[0]).toBeInstanceOf(CircuitOpenError);
    expect(a.lookup).toHaveBeenCalledTimes(2);
  });

  it('tries an open circuit anyway and closes it on success', async () => {
    const a = fakeProvider('a', down);
    const unicep = new Unicep({
      providers: [a.provider],
      circuitBreaker: { failureThreshold: 2, lastResort: true },
    });
    await openCircuits(unicep, 2);
    expect(unicep.status()[0]?.circuit).toBe('open');

    a.set(async () => ADDRESS);
    await expect(unicep.lookup('01310100')).resolves.toMatchObject({ provider: 'a' });
    expect(unicep.status()[0]?.circuit).toBe('closed');
  });

  it('tries the open providers after the closed ones failed, in priority order', async () => {
    const a = fakeProvider('a', down);
    const b = fakeProvider('b', down);
    const c = fakeProvider('c', down);
    const unicep = new Unicep({
      providers: [a.provider, b.provider, c.provider],
      circuitBreaker: { failureThreshold: 1, lastResort: true },
    });
    await unicep.lookup('01310100').catch(() => {}); // opens all three (threshold 1)
    expect(unicep.status().map((s) => s.circuit)).toEqual(['open', 'open', 'open']);

    b.set(async () => ADDRESS); // only b recovered
    await expect(unicep.lookup('01310100')).resolves.toMatchObject({ provider: 'b' });
    expect(a.lookup).toHaveBeenCalledTimes(2); // tried first and failed again
    expect(b.lookup).toHaveBeenCalledTimes(2); // answered
    expect(c.lookup).toHaveBeenCalledTimes(1); // never reached: b answered first
  });

  it('reports the real errors, not "circuit open", when the last resort fails too', async () => {
    const a = fakeProvider('a', down);
    const unicep = new Unicep({
      providers: [a.provider],
      circuitBreaker: { failureThreshold: 1, lastResort: true },
    });
    await unicep.lookup('01310100').catch(() => {});

    const error = await unicep.lookup('01310100').catch((e) => e);
    expect(error).toBeInstanceOf(AllProvidersFailedError);
    expect(error.errors[0]).toBeInstanceOf(ProviderError);
    expect(error.errors[0]).not.toBeInstanceOf(CircuitOpenError);
    expect(unicep.status()[0]?.circuit).toBe('open');
  });

  it('answers "not found" when the last resort provider says so', async () => {
    const a = fakeProvider('a', down);
    const unicep = new Unicep({
      providers: [a.provider],
      circuitBreaker: { failureThreshold: 1, lastResort: true },
    });
    await unicep.lookup('01310100').catch(() => {});

    a.set(notFound);
    await expect(unicep.lookup('01310100')).rejects.toBeInstanceOf(CepNotFoundError);
  });

  it('does not use the last resort when a provider already answered', async () => {
    const a = fakeProvider('a', down);
    const b = fakeProvider('b');
    const unicep = new Unicep({
      providers: [a.provider, b.provider],
      circuitBreaker: { failureThreshold: 1, lastResort: true },
    });
    await unicep.lookup('01310100'); // a fails and opens, b answers
    a.lookup.mockClear();

    await expect(unicep.lookup('01310100')).resolves.toMatchObject({ provider: 'b' });
    expect(a.lookup).not.toHaveBeenCalled();
  });

  it('stops when the caller cancels during the last resort', async () => {
    const a = fakeProvider('a', down);
    const unicep = new Unicep({
      providers: [a.provider],
      circuitBreaker: { failureThreshold: 1, lastResort: true },
    });
    await unicep.lookup('01310100').catch(() => {});

    const controller = new AbortController();
    a.set((_cep, { signal }) => {
      controller.abort(new Error('cancelled'));
      return Promise.reject(signal.reason);
    });
    await expect(unicep.lookup('01310100', { signal: controller.signal })).rejects.toThrow(
      'cancelled',
    );
  });
});
