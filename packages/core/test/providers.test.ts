import { describe, expect, it, vi } from 'vitest';
import {
  awesomeApi,
  brasilApi,
  CepNotFoundError,
  type CepProvider,
  defaultProviders,
  type HttpProviderOptions,
  openCep,
  ProviderError,
  viaCep,
} from '../src/index';

const CEP = '01310100';

const viaCepBody = {
  cep: '01310-100',
  logradouro: 'Avenida Paulista',
  complemento: 'de 612 a 1510 - lado par',
  bairro: 'Bela Vista',
  localidade: 'São Paulo',
  uf: 'SP',
  ibge: '3550308',
};

const EXPECTED = {
  cep: CEP,
  street: 'Avenida Paulista',
  neighborhood: 'Bela Vista',
  city: 'São Paulo',
  state: 'SP',
  ibgeCode: '3550308',
};

interface Case {
  name: string;
  create: (options: HttpProviderOptions) => CepProvider;
  url: string;
  body: unknown;
  expected: Record<string, unknown>;
  notFound: { status: number; body: unknown };
}

const cases: Case[] = [
  {
    name: 'viacep',
    create: viaCep,
    url: `https://viacep.com.br/ws/${CEP}/json/`,
    body: viaCepBody,
    expected: { ...EXPECTED, complement: 'de 612 a 1510 - lado par' },
    notFound: { status: 200, body: { erro: 'true' } },
  },
  {
    name: 'opencep',
    create: openCep,
    url: `https://opencep.com/v1/${CEP}`,
    body: viaCepBody,
    expected: { ...EXPECTED, complement: 'de 612 a 1510 - lado par' },
    notFound: { status: 404, body: { error: true } },
  },
  {
    name: 'brasilapi',
    create: brasilApi,
    url: `https://brasilapi.com.br/api/cep/v2/${CEP}`,
    body: {
      cep: CEP,
      state: 'SP',
      city: 'São Paulo',
      neighborhood: 'Bela Vista',
      street: 'Avenida Paulista',
      ibge: { city: '3550308', state: '35' },
    },
    expected: EXPECTED,
    notFound: { status: 404, body: { type: 'service_error' } },
  },
  {
    name: 'awesomeapi',
    create: awesomeApi,
    url: `https://cep.awesomeapi.com.br/json/${CEP}`,
    body: {
      cep: CEP,
      address: 'Avenida Paulista',
      district: 'Bela Vista',
      state: 'SP',
      city: 'São Paulo',
      city_ibge: '3550308',
    },
    expected: EXPECTED,
    notFound: { status: 404, body: { code: 'not_found' } },
  },
];

const context = () => ({ signal: new AbortController().signal });

function mockFetch(status: number, body: unknown) {
  return vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status }));
}

describe.each(cases)('$name provider', (c) => {
  it('maps the response to a normalized address', async () => {
    const fetch = mockFetch(200, c.body);
    const address = await c.create({ fetch }).lookup(CEP, context());
    expect(address).toMatchObject(c.expected);
  });

  it('requests the expected URL with the abort signal', async () => {
    const fetch = mockFetch(200, c.body);
    const { signal } = context();
    await c.create({ fetch }).lookup(CEP, { signal });
    expect(fetch).toHaveBeenCalledWith(c.url, expect.objectContaining({ signal }));
  });

  it('honors a custom base URL', async () => {
    const fetch = mockFetch(200, c.body);
    await c.create({ fetch, baseUrl: 'https://proxy.test/x' }).lookup(CEP, context());
    expect(fetch.mock.calls[0]?.[0]).toMatch(/^https:\/\/proxy\.test\/x\//);
  });

  it('throws CepNotFoundError when the CEP does not exist', async () => {
    const fetch = mockFetch(c.notFound.status, c.notFound.body);
    await expect(c.create({ fetch }).lookup(CEP, context())).rejects.toBeInstanceOf(
      CepNotFoundError,
    );
  });

  it.each([429, 500, 503])('throws ProviderError on HTTP %i', async (status) => {
    const fetch = mockFetch(status, { message: 'nope' });
    await expect(c.create({ fetch }).lookup(CEP, context())).rejects.toBeInstanceOf(ProviderError);
  });

  it('throws ProviderError when the network fails', async () => {
    const cause = new TypeError('fetch failed');
    const fetch = vi.fn<typeof globalThis.fetch>().mockRejectedValue(cause);
    const error = await c
      .create({ fetch })
      .lookup(CEP, context())
      .catch((e) => e);
    expect(error).toBeInstanceOf(ProviderError);
    expect(error.cause).toBe(cause);
  });

  it('throws ProviderError on a body that is not JSON', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () => new Response('<html>', { status: 200 }),
    );
    await expect(c.create({ fetch }).lookup(CEP, context())).rejects.toBeInstanceOf(ProviderError);
  });

  it('throws ProviderError when city or state is missing', async () => {
    const fetch = mockFetch(200, {});
    await expect(c.create({ fetch }).lookup(CEP, context())).rejects.toBeInstanceOf(ProviderError);
  });
});

describe('mapping details', () => {
  it('omits empty optional fields', async () => {
    const fetch = mockFetch(200, { ...viaCepBody, complemento: '', ibge: '' });
    const address = await viaCep({ fetch }).lookup(CEP, context());
    expect(address.complement).toBeUndefined();
    expect(address.ibgeCode).toBeUndefined();
  });

  it('accepts city-level CEPs without street and neighborhood', async () => {
    const fetch = mockFetch(200, { localidade: 'Sarandi', uf: 'pr', logradouro: '', bairro: '' });
    const address = await viaCep({ fetch }).lookup('87110970', context());
    expect(address).toMatchObject({ street: '', neighborhood: '', city: 'Sarandi', state: 'PR' });
  });

  it('treats a boolean ViaCEP "erro" flag as not found', async () => {
    const fetch = mockFetch(200, { erro: true });
    await expect(viaCep({ fetch }).lookup(CEP, context())).rejects.toBeInstanceOf(CepNotFoundError);
  });

  it('uses the global fetch when none is given', async () => {
    const original = globalThis.fetch;
    const fetch = mockFetch(200, viaCepBody);
    globalThis.fetch = fetch;
    try {
      await viaCep().lookup(CEP, context());
      expect(fetch).toHaveBeenCalledOnce();
    } finally {
      globalThis.fetch = original;
    }
  });
});

describe('awesomeapi api key', () => {
  const body = { address: 'Avenida Paulista', city: 'São Paulo', state: 'SP' };

  it('sends no query string without a key', async () => {
    const fetch = mockFetch(200, body);
    await awesomeApi({ fetch }).lookup(CEP, context());
    expect(fetch.mock.calls[0]?.[0]).toBe(`https://cep.awesomeapi.com.br/json/${CEP}`);
  });

  it('sends the key as the token query parameter, URL-encoded', async () => {
    const fetch = mockFetch(200, body);
    await awesomeApi({ fetch, apiKey: 'a b&c' }).lookup(CEP, context());
    expect(fetch.mock.calls[0]?.[0]).toBe(
      `https://cep.awesomeapi.com.br/json/${CEP}?token=a%20b%26c`,
    );
  });

  it('keeps the request CORS-simple (no custom headers)', async () => {
    const fetch = mockFetch(200, body);
    await awesomeApi({ fetch, apiKey: 'secret' }).lookup(CEP, context());
    expect(fetch.mock.calls[0]?.[1]?.headers).toEqual({ accept: 'application/json' });
  });

  it('treats a rejected key as a provider failure', async () => {
    const fetch = mockFetch(401, { message: 'invalid key' });
    await expect(
      awesomeApi({ fetch, apiKey: 'bad' }).lookup(CEP, context()),
    ).rejects.toBeInstanceOf(ProviderError);
  });

  it('defaultProviders adds awesomeapi last, with the key, only when a key is given', async () => {
    const fetch = mockFetch(200, viaCepBody);
    const providers = defaultProviders({ fetch, apiKeys: { awesomeapi: 'k' } });
    expect(providers.map((provider) => provider.name)).toEqual([
      'viacep',
      'brasilapi',
      'opencep',
      'awesomeapi',
    ]);
    for (const provider of providers) {
      await provider.lookup(CEP, context()).catch(() => {});
    }
    const urls = fetch.mock.calls.map((call) => String(call[0]));
    expect(urls.filter((url) => url.includes('token='))).toEqual([
      `https://cep.awesomeapi.com.br/json/${CEP}?token=k`,
    ]);
  });
});

describe('defaultProviders', () => {
  it('returns viacep, brasilapi and opencep by default, with unique names', () => {
    const names = defaultProviders().map((provider) => provider.name);
    expect(names).toEqual(['viacep', 'brasilapi', 'opencep']);
  });

  it('leaves awesomeapi out when the key is missing or empty', () => {
    expect(defaultProviders({ apiKeys: {} }).map((p) => p.name)).not.toContain('awesomeapi');
    expect(defaultProviders({ apiKeys: { awesomeapi: '' } }).map((p) => p.name)).not.toContain(
      'awesomeapi',
    );
  });

  it('forwards options to every provider', async () => {
    const fetch = mockFetch(200, viaCepBody);
    for (const provider of defaultProviders({ fetch })) {
      await provider.lookup(CEP, context()).catch(() => {});
    }
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
