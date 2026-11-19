import { describe, expect, it, vi } from 'vitest';
import {
  AllLocalityProvidersFailedError,
  brasilApiLocalities,
  CepNotFoundError,
  type CepProvider,
  CircuitOpenError,
  type City,
  defaultLocalityProviders,
  InvalidStateError,
  ibge,
  isValidUf,
  type LocalityProvider,
  type LookupContext,
  normalizeUf,
  ProviderError,
  type State,
  Unicep,
  ufs,
} from '../src/index';
import { byName, formatPlaceName } from '../src/localities';

const CTX = (): LookupContext => ({ signal: new AbortController().signal });

const ESTADOS = [
  { id: 35, uf: 'SP', name: 'São Paulo' },
  { id: 12, uf: 'AC', name: 'Acre' },
  { id: 33, uf: 'RJ', name: 'Rio de Janeiro' },
];
const CIDADES = [
  { name: 'Campinas', ibgeCode: '3509502' },
  { name: 'Águas de Lindóia', ibgeCode: '3500501' },
  { name: 'Adamantina', ibgeCode: '3500105' },
];

function fakeLocality(
  name: string,
  overrides: Partial<Pick<LocalityProvider, 'states' | 'cities'>> = {},
) {
  const states = vi.fn(overrides.states ?? (async () => ESTADOS.map((s) => ({ ...s }))));
  const cities = vi.fn(overrides.cities ?? (async () => CIDADES.map((c) => ({ ...c }))));
  const provider: LocalityProvider = { name, states, cities };
  return { provider, states, cities };
}

const down = () => Promise.reject(new ProviderError('x', 'down'));

function makeUnicep(
  localities: LocalityProvider[],
  extra: Partial<ConstructorParameters<typeof Unicep>[0]> = {},
) {
  const cep: CepProvider = { name: 'cep-only', lookup: vi.fn(async () => ({}) as never) };
  return new Unicep({ providers: [cep], localities: { providers: localities }, ...extra });
}

describe('uf helpers', () => {
  it('knows the 27 federative units', () => {
    expect(ufs).toHaveLength(27);
    expect(new Set(ufs).size).toBe(27);
  });

  it('normalizes and validates', () => {
    expect(normalizeUf(' sp ')).toBe('SP');
    expect(normalizeUf('Df')).toBe('DF');
    expect(normalizeUf('XX')).toBeUndefined();
    expect(normalizeUf('')).toBeUndefined();
    expect(isValidUf('rj')).toBe(true);
    expect(isValidUf('São Paulo')).toBe(false);
  });
});

describe('place names', () => {
  it('title-cases names that come in capitals, keeping pt-BR particles in lower case', () => {
    expect(formatPlaceName('ÁGUAS DE LINDÓIA')).toBe('Águas de Lindóia');
    expect(formatPlaceName('ABREU E LIMA')).toBe('Abreu e Lima');
    expect(formatPlaceName("SÃO JOÃO D'OESTE")).toBe("São João d'Oeste");
    expect(formatPlaceName('MOGI-GUAÇU')).toBe('Mogi-Guaçu');
    expect(formatPlaceName('SÃO JOSÉ DO RIO PRETO')).toBe('São José do Rio Preto');
    expect(formatPlaceName('DE')).toBe('De');
  });

  it('leaves names that already have lower case letters, and non-letters, untouched', () => {
    expect(formatPlaceName('Águas de Lindóia')).toBe('Águas de Lindóia');
    expect(formatPlaceName('123')).toBe('123');
  });

  it('sorts by name ignoring accents', () => {
    const names = [{ name: 'Óleo' }, { name: 'Zebra' }, { name: 'Ana' }, { name: 'Água' }].sort(
      byName,
    );
    expect(names.map((n) => n.name)).toEqual(['Água', 'Ana', 'Óleo', 'Zebra']);
  });
});

describe('built-in locality providers', () => {
  const json = (body: unknown, status = 200) =>
    vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status }));

  const brasilStates = [
    { id: 35, sigla: 'SP', nome: 'São Paulo', regiao: {}, capital: 'São Paulo' },
    { id: 12, sigla: 'AC', nome: 'Acre', regiao: {}, capital: 'Rio Branco' },
  ];
  const ibgeCities = [
    { id: 3500105, nome: 'Adamantina', microrregiao: {} },
    { id: 3500204, nome: 'Adolfo' },
  ];

  it('BrasilAPI maps states and requests the IBGE endpoints', async () => {
    const fetch = json(brasilStates);
    const states = await brasilApiLocalities({ fetch }).states(CTX());
    expect(states).toEqual([
      { id: 35, uf: 'SP', name: 'São Paulo' },
      { id: 12, uf: 'AC', name: 'Acre' },
    ]);
    expect(fetch.mock.calls[0]?.[0]).toBe('https://brasilapi.com.br/api/ibge/uf/v1');
  });

  it('BrasilAPI maps cities and fixes the capital letters', async () => {
    const fetch = json([
      { nome: 'ÁGUAS DE LINDÓIA', codigo_ibge: '3500501' },
      { nome: 'ADAMANTINA', codigo_ibge: '3500105' },
    ]);
    const cities = await brasilApiLocalities({ fetch }).cities('SP', CTX());
    expect(cities).toEqual([
      { name: 'Águas de Lindóia', ibgeCode: '3500501' },
      { name: 'Adamantina', ibgeCode: '3500105' },
    ]);
    expect(fetch.mock.calls[0]?.[0]).toBe('https://brasilapi.com.br/api/ibge/municipios/v1/SP');
  });

  it('IBGE maps states and cities', async () => {
    const states = await ibge({ fetch: json(brasilStates) }).states(CTX());
    expect(states[0]).toEqual({ id: 35, uf: 'SP', name: 'São Paulo' });

    const fetch = json(ibgeCities);
    const cities = await ibge({ fetch }).cities('SP', CTX());
    expect(cities).toEqual([
      { name: 'Adamantina', ibgeCode: '3500105' },
      { name: 'Adolfo', ibgeCode: '3500204' },
    ]);
    expect(fetch.mock.calls[0]?.[0]).toBe(
      'https://servicodados.ibge.gov.br/api/v1/localidades/estados/SP/municipios?orderBy=nome',
    );
  });

  it('use the shared provider names, so BrasilAPI shares the circuit of the CEP provider', () => {
    expect(brasilApiLocalities().name).toBe('brasilapi');
    expect(ibge().name).toBe('ibge');
    expect(defaultLocalityProviders().map((p) => p.name)).toEqual(['brasilapi', 'ibge']);
  });

  it.each([
    ['brasilapi', brasilApiLocalities],
    ['ibge', ibge],
  ])('%s throws ProviderError on HTTP errors, empty or malformed bodies', async (_name, create) => {
    await expect(create({ fetch: json({}, 500) }).states(CTX())).rejects.toBeInstanceOf(
      ProviderError,
    );
    await expect(create({ fetch: json([]) }).states(CTX())).rejects.toBeInstanceOf(ProviderError);
    await expect(create({ fetch: json({ a: 1 }) }).cities('SP', CTX())).rejects.toBeInstanceOf(
      ProviderError,
    );
    await expect(
      create({ fetch: json([{ nome: 'x' }]) }).cities('SP', CTX()),
    ).rejects.toBeInstanceOf(ProviderError);
    const network = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('fetch failed'));
    await expect(create({ fetch: network }).states(CTX())).rejects.toBeInstanceOf(ProviderError);
  });

  it('defaultLocalityProviders only shares fetch, not the base URL', async () => {
    const fetch = json(brasilStates);
    const [first] = defaultLocalityProviders({ fetch, baseUrl: 'https://wrong.example' });
    await first?.states(CTX());
    expect(String(fetch.mock.calls[0]?.[0])).toBe('https://brasilapi.com.br/api/ibge/uf/v1');
  });
});

describe('Unicep.states and Unicep.cities', () => {
  it('lists the states sorted by name', async () => {
    const a = fakeLocality('a');
    const states = await makeUnicep([a.provider]).states();
    expect(states.map((s) => s.uf)).toEqual(['AC', 'RJ', 'SP']);
  });

  it('lists the cities of a state sorted by name, accepting any case', async () => {
    const a = fakeLocality('a');
    const cities = await makeUnicep([a.provider]).cities('sp');
    expect(cities.map((c) => c.name)).toEqual(['Adamantina', 'Águas de Lindóia', 'Campinas']);
    expect(a.cities).toHaveBeenCalledWith('SP', expect.anything());
  });

  it('rejects an invalid UF without calling any provider', async () => {
    const a = fakeLocality('a');
    const unicep = makeUnicep([a.provider]);
    await expect(unicep.cities('XX')).rejects.toBeInstanceOf(InvalidStateError);
    await expect(unicep.cities('')).rejects.toBeInstanceOf(InvalidStateError);
    expect(a.cities).not.toHaveBeenCalled();
  });

  it('falls back to the next provider', async () => {
    const a = fakeLocality('a', { states: down, cities: down });
    const b = fakeLocality('b');
    const unicep = makeUnicep([a.provider, b.provider]);
    await expect(unicep.states()).resolves.toHaveLength(3);
    await expect(unicep.cities('SP')).resolves.toHaveLength(3);
  });

  it('throws AllLocalityProvidersFailedError with one error per provider', async () => {
    const a = fakeLocality('a', { states: down, cities: down });
    const b = fakeLocality('b', { states: down, cities: down });
    const unicep = makeUnicep([a.provider, b.provider]);

    const statesError = await unicep.states().catch((e) => e);
    expect(statesError).toBeInstanceOf(AllLocalityProvidersFailedError);
    expect(statesError.resource).toBe('states');
    expect(statesError.errors).toHaveLength(2);

    const citiesError = await unicep.cities('SP').catch((e) => e);
    expect(citiesError.resource).toBe('cities');
  });

  it('caches states and cities per UF by default and hands out copies', async () => {
    const a = fakeLocality('a');
    const unicep = makeUnicep([a.provider]);

    const first = await unicep.states();
    if (first[0]) first[0].name = 'changed';
    const second = await unicep.states();
    expect(second[0]?.name).not.toBe('changed');
    expect(a.states).toHaveBeenCalledOnce();

    await unicep.cities('SP');
    await unicep.cities('sp');
    expect(a.cities).toHaveBeenCalledOnce();
    await unicep.cities('RJ');
    expect(a.cities).toHaveBeenCalledTimes(2);
  });

  it('clearCache also clears states and cities', async () => {
    const a = fakeLocality('a');
    const unicep = makeUnicep([a.provider]);
    await unicep.states();
    await unicep.cities('SP');
    unicep.clearCache();
    await unicep.states();
    await unicep.cities('SP');
    expect(a.states).toHaveBeenCalledTimes(2);
    expect(a.cities).toHaveBeenCalledTimes(2);
  });

  it('can disable the cache, or tune it', async () => {
    const a = fakeLocality('a');
    const off = makeUnicep([a.provider], { localities: { providers: [a.provider], cache: false } });
    await off.states();
    await off.states();
    expect(a.states).toHaveBeenCalledTimes(2);

    expect(() => makeUnicep([a.provider], { localities: { cache: { ttlMs: 0 } } })).toThrow(
      RangeError,
    );
  });

  it('expires cached entries after the ttl', async () => {
    vi.useFakeTimers();
    try {
      const a = fakeLocality('a');
      const unicep = new Unicep({
        providers: [{ name: 'c', lookup: vi.fn() }],
        localities: { providers: [a.provider], cache: { ttlMs: 1_000 } },
      });
      await unicep.states();
      await vi.advanceTimersByTimeAsync(1_001);
      await unicep.states();
      expect(a.states).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects duplicate locality provider names', () => {
    const a = fakeLocality('a');
    expect(() => makeUnicep([a.provider, a.provider])).toThrow(/Duplicate/);
  });

  it('has real locality providers by default', () => {
    const cep: CepProvider = { name: 'c', lookup: vi.fn() };
    expect(new Unicep({ providers: [cep] }).localitiesStatus().map((s) => s.name)).toEqual([
      'brasilapi',
      'ibge',
    ]);
  });

  it('stops when the caller cancels', async () => {
    const a = fakeLocality('a');
    const unicep = makeUnicep([a.provider]);
    await expect(unicep.states({ signal: AbortSignal.abort() })).rejects.toThrow();
    expect(a.states).not.toHaveBeenCalled();
  });
});

describe('circuit breakers shared with the CEP providers', () => {
  it('a CEP provider and a locality provider with the same name share one circuit', async () => {
    const cep: CepProvider = {
      name: 'brasilapi',
      lookup: vi.fn(() => Promise.reject(new ProviderError('brasilapi', 'down'))),
    };
    const brasil = fakeLocality('brasilapi');
    const ibgeProvider = fakeLocality('ibge');
    const unicep = new Unicep({
      providers: [cep],
      circuitBreaker: { failureThreshold: 1 },
      localities: { providers: [brasil.provider, ibgeProvider.provider] },
    });

    await unicep.lookup('01310100').catch(() => {}); // the CEP failure opens the "brasilapi" circuit
    expect(unicep.status()[0]).toEqual({ name: 'brasilapi', circuit: 'open' });
    expect(unicep.localitiesStatus()).toEqual([
      { name: 'brasilapi', circuit: 'open' },
      { name: 'ibge', circuit: 'closed' },
    ]);

    await expect(unicep.states()).resolves.toHaveLength(3);
    expect(brasil.states).not.toHaveBeenCalled(); // skipped
    expect(ibgeProvider.states).toHaveBeenCalledOnce();
  });

  it('locality failures open the circuit and skip the provider', async () => {
    const a = fakeLocality('a', { states: down, cities: down });
    const b = fakeLocality('b');
    const unicep = makeUnicep([a.provider, b.provider], {
      circuitBreaker: { failureThreshold: 2 },
      localities: { providers: [a.provider, b.provider], cache: false },
    });
    await unicep.states();
    await unicep.states();
    expect(unicep.localitiesStatus()[0]).toEqual({ name: 'a', circuit: 'open' });
    await unicep.states();
    expect(a.states).toHaveBeenCalledTimes(2);
  });

  it('reports open circuits when every locality provider is skipped', async () => {
    const a = fakeLocality('a', { states: down });
    const unicep = new Unicep({
      providers: [{ name: 'c', lookup: vi.fn() }],
      circuitBreaker: { failureThreshold: 1 },
      localities: { providers: [a.provider], cache: false },
    });
    await unicep.states().catch(() => {});
    const error = await unicep.states().catch((e) => e);
    expect(error.errors[0]).toBeInstanceOf(CircuitOpenError);
  });

  it('applies lastResort to localities', async () => {
    let healthy = false;
    const a = fakeLocality('a', {
      states: () => (healthy ? Promise.resolve(ESTADOS.map((s) => ({ ...s }))) : down()),
    });
    const unicep = new Unicep({
      providers: [{ name: 'c', lookup: vi.fn() }],
      circuitBreaker: { failureThreshold: 1, lastResort: true },
      localities: { providers: [a.provider], cache: false },
    });
    await unicep.states().catch(() => {});
    expect(unicep.localitiesStatus()[0]?.circuit).toBe('open');

    healthy = true;
    await expect(unicep.states()).resolves.toHaveLength(3);
    expect(unicep.localitiesStatus()[0]?.circuit).toBe('closed');
  });

  it('retries a failing locality provider before falling back', async () => {
    let calls = 0;
    const a = fakeLocality('a', {
      states: () => (++calls < 2 ? down() : Promise.resolve(ESTADOS.map((s): State => ({ ...s })))),
    });
    const b = fakeLocality('b');
    const unicep = new Unicep({
      providers: [{ name: 'c', lookup: vi.fn() }],
      retry: { attempts: 1, delayMs: 1 },
      localities: { providers: [a.provider, b.provider], cache: false },
    });
    await expect(unicep.states()).resolves.toHaveLength(3);
    expect(a.states).toHaveBeenCalledTimes(2);
    expect(b.states).not.toHaveBeenCalled();
  });

  it('does not treat a CEP "not found" as a locality concern', async () => {
    const cep: CepProvider = {
      name: 'x',
      lookup: vi.fn(() => Promise.reject(new CepNotFoundError('01310100'))),
    };
    const a = fakeLocality('a');
    const unicep = new Unicep({ providers: [cep], localities: { providers: [a.provider] } });
    await expect(unicep.states()).resolves.toHaveLength(3);
  });
});

describe('types', () => {
  it('exposes State and City shapes', async () => {
    const a = fakeLocality('a');
    const [state] = await makeUnicep([a.provider]).states();
    const [city] = await makeUnicep([a.provider]).cities('SP');
    const asState: State | undefined = state;
    const asCity: City | undefined = city;
    expect(asState).toMatchObject({ id: expect.any(Number), uf: expect.any(String) });
    expect(asCity).toMatchObject({ name: expect.any(String), ibgeCode: expect.any(String) });
  });
});
