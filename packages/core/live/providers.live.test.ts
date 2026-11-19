import { describe, expect, it } from 'vitest';
import {
  awesomeApi,
  brasilApi,
  CepNotFoundError,
  defaultProviders,
  openCep,
  Unicep,
  viaCep,
} from '../src/index';

/**
 * Contract tests against the real public services. They are not part of the regular test run
 * (`pnpm test:live`) and exist to detect when a service changes its response format.
 */

const KNOWN_CEP = '01310100'; // Avenida Paulista, São Paulo
const UNKNOWN_CEP = '00000000';

const providers = {
  viacep: viaCep(),
  brasilapi: brasilApi(),
  opencep: openCep(),
  awesomeapi: awesomeApi(),
};

const context = () => ({ signal: AbortSignal.timeout(10_000) });

describe.each(Object.entries(providers))('%s (live)', (_name, provider) => {
  it('returns the expected address for a known CEP', async () => {
    const address = await provider.lookup(KNOWN_CEP, context());
    expect(address).toMatchObject({
      cep: KNOWN_CEP,
      city: 'São Paulo',
      state: 'SP',
      neighborhood: 'Bela Vista',
      ibgeCode: '3550308',
    });
    expect(address.street).toContain('Paulista');
  });

  it('reports an unknown CEP as not found', async () => {
    await expect(provider.lookup(UNKNOWN_CEP, context())).rejects.toBeInstanceOf(CepNotFoundError);
  });
});

describe('Unicep with default providers (live)', () => {
  const unicep = new Unicep({ providers: defaultProviders(), timeoutMs: 10_000 });

  it('resolves a known CEP', async () => {
    await expect(unicep.lookup('01310-100')).resolves.toMatchObject({
      cep: KNOWN_CEP,
      state: 'SP',
    });
  });

  it('throws CepNotFoundError for an unknown CEP', async () => {
    await expect(unicep.lookup(UNKNOWN_CEP)).rejects.toBeInstanceOf(CepNotFoundError);
  });
});
