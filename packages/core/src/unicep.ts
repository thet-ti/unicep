import {
  BrokenCircuitError,
  type CircuitBreakerPolicy,
  CircuitState,
  ConsecutiveBreaker,
  circuitBreaker,
  handleWhen,
} from 'cockatiel';
import { TtlCache } from './cache';
import { isValidCep, normalizeCep } from './cep';
import {
  AllLocalityProvidersFailedError,
  AllProvidersFailedError,
  CepNotFoundError,
  CircuitOpenError,
  InvalidCepError,
  InvalidStateError,
  ProviderError,
  type UnicepError,
} from './errors';
import { byName, normalizeUf } from './localities';
import { defaultLocalityProviders } from './providers/localities';
import type {
  Address,
  CacheOptions,
  CepProvider,
  CircuitStatus,
  City,
  LocalityProvider,
  LookupContext,
  LookupOptions,
  ProviderStatus,
  State,
  UnicepOptions,
} from './types';

const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_FAILURE_THRESHOLD = 3;
const DEFAULT_RESET_TIMEOUT_MS = 30_000;
const DEFAULT_RETRY_DELAY_MS = 200;
const DEFAULT_CACHE_TTL_MS = 5 * 60_000;
const DEFAULT_CACHE_MAX_ENTRIES = 500;
const DEFAULT_LOCALITIES_TTL_MS = 24 * 60 * 60_000;
const LOCALITIES_MAX_ENTRIES = 64;

/** The circuit of a provider name, shared by its CEP and locality providers. */
interface Circuit {
  /** Replaced with a fresh (closed) breaker when a last resort attempt succeeds. */
  breaker: CircuitBreakerPolicy;
}

interface Entry<P> {
  provider: P;
  circuit: Circuit;
}

type Outcome<P, T> = { ok: true; provider: P; value: T } | { ok: false; failures: UnicepError[] };

function buildCache<T>(
  options: CacheOptions | undefined,
  defaults: { ttlMs: number; maxEntries: number },
): TtlCache<T> | undefined {
  if (!options) return undefined;
  const ttlMs = options.ttlMs ?? defaults.ttlMs;
  const maxEntries = options.maxEntries ?? defaults.maxEntries;
  if (ttlMs <= 0) throw new RangeError('cache.ttlMs must be positive');
  if (!Number.isInteger(maxEntries) || maxEntries < 1) {
    throw new RangeError('cache.maxEntries must be a positive integer');
  }
  return new TtlCache<T>(ttlMs, maxEntries);
}

function assertUniqueNames(providers: readonly { name: string }[]): void {
  const names = new Set<string>();
  for (const { name } of providers) {
    if (names.has(name)) throw new TypeError(`Duplicate provider name: "${name}"`);
    names.add(name);
  }
}

/**
 * Looks up CEPs (and lists states and cities) across several providers, in priority order,
 * skipping providers whose circuit is open and falling back to the next one on failure.
 */
export class Unicep {
  readonly #entries: readonly Entry<CepProvider>[];
  readonly #localityEntries: readonly Entry<LocalityProvider>[];
  readonly #circuits = new Map<string, Circuit>();
  readonly #createBreaker: () => CircuitBreakerPolicy;
  readonly #lastResort: boolean;
  readonly #timeoutMs: number;
  readonly #retries: number;
  readonly #retryDelayMs: number;
  readonly #cache: TtlCache<Address> | undefined;
  readonly #statesCache: TtlCache<State[]> | undefined;
  readonly #citiesCache: TtlCache<City[]> | undefined;

  constructor(options: UnicepOptions) {
    if (options.providers.length === 0) {
      throw new TypeError('Unicep requires at least one provider');
    }
    assertUniqueNames(options.providers);

    this.#timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.#retries = options.retry?.attempts ?? 0;
    this.#retryDelayMs = options.retry?.delayMs ?? DEFAULT_RETRY_DELAY_MS;
    if (!Number.isInteger(this.#retries) || this.#retries < 0) {
      throw new RangeError('retry.attempts must be a non-negative integer');
    }
    this.#cache = buildCache(options.cache, {
      ttlMs: DEFAULT_CACHE_TTL_MS,
      maxEntries: DEFAULT_CACHE_MAX_ENTRIES,
    });

    const failureThreshold = options.circuitBreaker?.failureThreshold ?? DEFAULT_FAILURE_THRESHOLD;
    const halfOpenAfter = options.circuitBreaker?.resetTimeoutMs ?? DEFAULT_RESET_TIMEOUT_MS;
    this.#lastResort = options.circuitBreaker?.lastResort ?? false;
    // Only provider failures count; "not found" answers and cancellations do not.
    this.#createBreaker = () =>
      circuitBreaker(
        handleWhen((error) => error instanceof ProviderError),
        {
          halfOpenAfter,
          breaker: new ConsecutiveBreaker(failureThreshold),
        },
      );

    this.#entries = options.providers.map((provider) => ({
      provider,
      circuit: this.#circuit(provider.name),
    }));

    const localityProviders = options.localities?.providers ?? defaultLocalityProviders();
    assertUniqueNames(localityProviders);
    this.#localityEntries = localityProviders.map((provider) => ({
      provider,
      circuit: this.#circuit(provider.name),
    }));

    const localitiesCache =
      options.localities?.cache === false ? undefined : (options.localities?.cache ?? {});
    const localitiesDefaults = { ttlMs: DEFAULT_LOCALITIES_TTL_MS, maxEntries: 1 };
    this.#statesCache = buildCache(localitiesCache, localitiesDefaults);
    this.#citiesCache = buildCache(localitiesCache, {
      ...localitiesDefaults,
      maxEntries: LOCALITIES_MAX_ENTRIES,
    });
  }

  /** Looks up a CEP (with or without hyphen). */
  async lookup(input: string, options: LookupOptions = {}): Promise<Address> {
    if (!isValidCep(input)) throw new InvalidCepError(input);
    const cep = normalizeCep(input);
    const userSignal = options.signal;
    userSignal?.throwIfAborted();

    const cached = this.#cache?.get(cep);
    if (cached) return { ...cached };

    const outcome = await this.#run(this.#entries, userSignal, (provider, context) =>
      provider.lookup(cep, context),
    );

    if (outcome.ok) {
      const address: Address = { ...outcome.value, provider: outcome.provider.name };
      this.#cache?.set(cep, address);
      return { ...address };
    }

    const { failures } = outcome;
    const attempted = failures.filter((error) => !(error instanceof CircuitOpenError));
    if (attempted.length > 0 && attempted.every((error) => error instanceof CepNotFoundError)) {
      throw new CepNotFoundError(cep);
    }
    throw new AllProvidersFailedError(cep, failures);
  }

  /** Lists the Brazilian states, sorted by name. Cached for 24 hours by default. */
  async states(options: LookupOptions = {}): Promise<State[]> {
    options.signal?.throwIfAborted();

    const cached = this.#statesCache?.get('states');
    if (cached) return cached.map((state) => ({ ...state }));

    const outcome = await this.#run(this.#localityEntries, options.signal, (provider, context) =>
      provider.states(context),
    );
    if (!outcome.ok) throw new AllLocalityProvidersFailedError('states', outcome.failures);

    const states = outcome.value.map((state) => ({ ...state })).sort(byName);
    this.#statesCache?.set('states', states);
    return states.map((state) => ({ ...state }));
  }

  /** Lists the cities of a state (UF, case insensitive), sorted by name. Cached by default. */
  async cities(uf: string, options: LookupOptions = {}): Promise<City[]> {
    const normalized = normalizeUf(uf);
    if (!normalized) throw new InvalidStateError(uf);
    options.signal?.throwIfAborted();

    const cached = this.#citiesCache?.get(normalized);
    if (cached) return cached.map((city) => ({ ...city }));

    const outcome = await this.#run(this.#localityEntries, options.signal, (provider, context) =>
      provider.cities(normalized, context),
    );
    if (!outcome.ok) throw new AllLocalityProvidersFailedError('cities', outcome.failures);

    const cities = outcome.value.map((city) => ({ ...city })).sort(byName);
    this.#citiesCache?.set(normalized, cities);
    return cities.map((city) => ({ ...city }));
  }

  /** Current circuit state of every CEP provider, in priority order. */
  status(): ProviderStatus[] {
    return statusOf(this.#entries);
  }

  /**
   * Current circuit state of the locality providers (states and cities). A provider that has
   * the same name as a CEP provider, like `brasilapi`, shares its circuit with it.
   */
  localitiesStatus(): ProviderStatus[] {
    return statusOf(this.#localityEntries);
  }

  /** Clears the in-memory caches (CEPs, states and cities), if enabled. */
  clearCache(): void {
    this.#cache?.clear();
    this.#statesCache?.clear();
    this.#citiesCache?.clear();
  }

  #circuit(name: string): Circuit {
    let circuit = this.#circuits.get(name);
    if (!circuit) {
      circuit = { breaker: this.#createBreaker() };
      this.#circuits.set(name, circuit);
    }
    return circuit;
  }

  /**
   * Tries the providers in order, each behind its circuit breaker, and returns the first
   * answer, or every failure (including "not found") when none succeeded.
   */
  async #run<P extends { readonly name: string }, T>(
    entries: readonly Entry<P>[],
    userSignal: AbortSignal | undefined,
    call: (provider: P, context: LookupContext) => Promise<T>,
  ): Promise<Outcome<P, T>> {
    const failures: UnicepError[] = [];
    const skipped: { entry: Entry<P>; slot: number }[] = [];

    for (const entry of entries) {
      const { provider, circuit } = entry;
      try {
        const value = await circuit.breaker.execute(() =>
          this.#execute(provider.name, userSignal, (context) => call(provider, context)),
        );
        return { ok: true, provider, value };
      } catch (error) {
        if (userSignal?.aborted) throw userSignal.reason;
        if (error instanceof BrokenCircuitError) {
          skipped.push({ entry, slot: failures.length });
          failures.push(new CircuitOpenError(provider.name));
        } else {
          failures.push(asProviderFailure(error));
        }
      }
    }

    // Last resort: try the providers whose circuit was open, bypassing their breakers.
    if (this.#lastResort) {
      for (const { entry, slot } of skipped) {
        const { provider, circuit } = entry;
        try {
          const value = await this.#execute(provider.name, userSignal, (context) =>
            call(provider, context),
          );
          circuit.breaker = this.#createBreaker();
          return { ok: true, provider, value };
        } catch (error) {
          if (userSignal?.aborted) throw userSignal.reason;
          failures[slot] = asProviderFailure(error);
        }
      }
    }

    return { ok: false, failures };
  }

  /** Runs one operation on one provider, retrying provider failures with exponential backoff. */
  async #execute<T>(
    name: string,
    userSignal: AbortSignal | undefined,
    run: (context: LookupContext) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.#attempt(name, userSignal, run);
      } catch (error) {
        // "Not found" and cancellations are final; only provider failures are retried.
        if (!(error instanceof ProviderError) || attempt >= this.#retries) throw error;
        await sleep(this.#retryDelayMs * 2 ** attempt, userSignal);
      }
    }
  }

  async #attempt<T>(
    name: string,
    userSignal: AbortSignal | undefined,
    run: (context: LookupContext) => Promise<T>,
  ): Promise<T> {
    const timeout = AbortSignal.timeout(this.#timeoutMs);
    const signal = userSignal ? AbortSignal.any([userSignal, timeout]) : timeout;
    try {
      return await run({ signal });
    } catch (error) {
      // Cancellation by the caller is not a provider failure.
      if (userSignal?.aborted) throw userSignal.reason;
      if (error instanceof CepNotFoundError || error instanceof ProviderError) throw error;
      throw new ProviderError(name, undefined, { cause: error });
    }
  }
}

function statusOf(entries: readonly Entry<{ readonly name: string }>[]): ProviderStatus[] {
  return entries.map(({ provider, circuit }) => ({
    name: provider.name,
    circuit: toStatus(circuit.breaker.state),
  }));
}

/** Keeps "not found" and provider failures; anything else is a bug and is rethrown. */
function asProviderFailure(error: unknown): UnicepError {
  if (error instanceof CepNotFoundError || error instanceof ProviderError) return error;
  throw error;
}

/** Resolves after `ms`, or rejects with the abort reason if the signal fires first. */
function sleep(ms: number, signal: AbortSignal | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function toStatus(state: CircuitState): CircuitStatus {
  switch (state) {
    case CircuitState.Closed:
      return 'closed';
    case CircuitState.HalfOpen:
      return 'half-open';
    default:
      return 'open';
  }
}
