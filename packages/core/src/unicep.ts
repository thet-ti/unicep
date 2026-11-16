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
  AllProvidersFailedError,
  CepNotFoundError,
  CircuitOpenError,
  InvalidCepError,
  ProviderError,
  type UnicepError,
} from './errors';
import type {
  Address,
  CepProvider,
  CircuitStatus,
  LookupOptions,
  ProviderAddress,
  ProviderStatus,
  UnicepOptions,
} from './types';

const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_FAILURE_THRESHOLD = 3;
const DEFAULT_RESET_TIMEOUT_MS = 30_000;
const DEFAULT_RETRY_DELAY_MS = 200;
const DEFAULT_CACHE_TTL_MS = 5 * 60_000;
const DEFAULT_CACHE_MAX_ENTRIES = 500;

interface ProviderEntry {
  provider: CepProvider;
  breaker: CircuitBreakerPolicy;
}

/**
 * Looks up CEPs across several providers, in priority order, skipping providers whose circuit
 * is open and falling back to the next one on failure.
 */
export class Unicep {
  readonly #entries: readonly ProviderEntry[];
  readonly #timeoutMs: number;
  readonly #retries: number;
  readonly #retryDelayMs: number;
  readonly #cache: TtlCache<Address> | undefined;

  constructor(options: UnicepOptions) {
    if (options.providers.length === 0) {
      throw new TypeError('Unicep requires at least one provider');
    }
    const names = new Set<string>();
    for (const { name } of options.providers) {
      if (names.has(name)) throw new TypeError(`Duplicate provider name: "${name}"`);
      names.add(name);
    }

    this.#timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.#retries = options.retry?.attempts ?? 0;
    this.#retryDelayMs = options.retry?.delayMs ?? DEFAULT_RETRY_DELAY_MS;
    if (!Number.isInteger(this.#retries) || this.#retries < 0) {
      throw new RangeError('retry.attempts must be a non-negative integer');
    }
    if (options.cache) {
      const ttlMs = options.cache.ttlMs ?? DEFAULT_CACHE_TTL_MS;
      const maxEntries = options.cache.maxEntries ?? DEFAULT_CACHE_MAX_ENTRIES;
      if (ttlMs <= 0) throw new RangeError('cache.ttlMs must be positive');
      if (!Number.isInteger(maxEntries) || maxEntries < 1) {
        throw new RangeError('cache.maxEntries must be a positive integer');
      }
      this.#cache = new TtlCache(ttlMs, maxEntries);
    }

    const failureThreshold = options.circuitBreaker?.failureThreshold ?? DEFAULT_FAILURE_THRESHOLD;
    const halfOpenAfter = options.circuitBreaker?.resetTimeoutMs ?? DEFAULT_RESET_TIMEOUT_MS;

    this.#entries = options.providers.map((provider) => ({
      provider,
      // Only provider failures count; "not found" answers and cancellations do not.
      breaker: circuitBreaker(
        handleWhen((error) => error instanceof ProviderError),
        {
          halfOpenAfter,
          breaker: new ConsecutiveBreaker(failureThreshold),
        },
      ),
    }));
  }

  /** Looks up a CEP (with or without hyphen). */
  async lookup(input: string, options: LookupOptions = {}): Promise<Address> {
    if (!isValidCep(input)) throw new InvalidCepError(input);
    const cep = normalizeCep(input);
    const userSignal = options.signal;
    userSignal?.throwIfAborted();

    const cached = this.#cache?.get(cep);
    if (cached) return { ...cached };

    const failures: UnicepError[] = [];
    let notFound = 0;

    for (const { provider, breaker } of this.#entries) {
      try {
        const result = await breaker.execute(() => this.#query(provider, cep, userSignal));
        const address: Address = { ...result, provider: provider.name };
        this.#cache?.set(cep, address);
        return { ...address };
      } catch (error) {
        if (userSignal?.aborted) throw userSignal.reason;
        if (error instanceof CepNotFoundError) {
          notFound++;
          failures.push(error);
        } else if (error instanceof BrokenCircuitError) {
          failures.push(new CircuitOpenError(provider.name));
        } else if (error instanceof ProviderError) {
          failures.push(error);
        } else {
          throw error;
        }
      }
    }

    const attempted = failures.filter((error) => !(error instanceof CircuitOpenError));
    if (attempted.length > 0 && notFound === attempted.length) {
      throw new CepNotFoundError(cep);
    }
    throw new AllProvidersFailedError(cep, failures);
  }

  /** Current circuit state of every provider, in priority order. */
  status(): ProviderStatus[] {
    return this.#entries.map(({ provider, breaker }) => ({
      name: provider.name,
      circuit: toStatus(breaker.state),
    }));
  }

  /** Clears the in-memory cache, if enabled. */
  clearCache(): void {
    this.#cache?.clear();
  }

  /** Queries one provider, retrying provider failures with exponential backoff. */
  async #query(
    provider: CepProvider,
    cep: string,
    userSignal: AbortSignal | undefined,
  ): Promise<ProviderAddress> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.#attempt(provider, cep, userSignal);
      } catch (error) {
        // "Not found" and cancellations are final; only provider failures are retried.
        if (!(error instanceof ProviderError) || attempt >= this.#retries) throw error;
        await sleep(this.#retryDelayMs * 2 ** attempt, userSignal);
      }
    }
  }

  async #attempt(
    provider: CepProvider,
    cep: string,
    userSignal: AbortSignal | undefined,
  ): Promise<ProviderAddress> {
    const timeout = AbortSignal.timeout(this.#timeoutMs);
    const signal = userSignal ? AbortSignal.any([userSignal, timeout]) : timeout;
    try {
      return await provider.lookup(cep, { signal });
    } catch (error) {
      // Cancellation by the caller is not a provider failure.
      if (userSignal?.aborted) throw userSignal.reason;
      if (error instanceof CepNotFoundError || error instanceof ProviderError) throw error;
      throw new ProviderError(provider.name, undefined, { cause: error });
    }
  }
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
