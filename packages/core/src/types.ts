/** Normalized address returned by every provider. */
export interface Address {
  /** 8 digits, no mask (e.g. `01310100`). */
  cep: string;
  street: string;
  complement?: string | undefined;
  neighborhood: string;
  city: string;
  /** Two-letter state code (UF), e.g. `SP`. */
  state: string;
  /** 7-digit IBGE municipality code, when the provider exposes it. */
  ibgeCode?: string | undefined;
  /** Name of the provider that answered the lookup. */
  provider: string;
}

/** What a provider returns; `provider` is stamped by the core. */
export type ProviderAddress = Omit<Address, 'provider'>;

export interface LookupContext {
  /** Aborted on timeout or when the caller cancels the lookup. */
  signal: AbortSignal;
}

/**
 * Adapter for a CEP service.
 *
 * - Resolve with the mapped address on success.
 * - Throw `CepNotFoundError` when the service answers that the CEP does not exist.
 * - Throw `ProviderError` (or any other error) for transport or server failures; those count
 *   against the provider's circuit breaker.
 */
export interface CepProvider {
  readonly name: string;
  lookup(cep: string, context: LookupContext): Promise<ProviderAddress>;
}

export interface CircuitBreakerOptions {
  /** Consecutive failures before a provider's circuit opens. Default: 3. */
  failureThreshold?: number;
  /** Milliseconds an open circuit waits before allowing a trial request. Default: 30000. */
  resetTimeoutMs?: number;
}

export interface RetryOptions {
  /**
   * Extra attempts on the same provider after a failure, before falling back to the next one.
   * Default: 0 (fallback only).
   */
  attempts?: number;
  /** Delay before the first retry in milliseconds, doubled on each further retry. Default: 200. */
  delayMs?: number;
}

export interface CacheOptions {
  /** How long a successful lookup is reused, in milliseconds. Default: 300000 (5 minutes). */
  ttlMs?: number;
  /** Maximum number of cached CEPs; the least recently used is evicted first. Default: 500. */
  maxEntries?: number;
}

export interface UnicepOptions {
  /** Providers in priority order. */
  providers: readonly CepProvider[];
  /** Per-provider, per-attempt timeout in milliseconds. Default: 5000. */
  timeoutMs?: number;
  circuitBreaker?: CircuitBreakerOptions;
  /** Retries failed providers before falling back. Disabled by default. */
  retry?: RetryOptions;
  /** Caches successful lookups in memory. Disabled by default. */
  cache?: CacheOptions;
}

export interface LookupOptions {
  /** Cancels the lookup. Cancellation never counts against a circuit breaker. */
  signal?: AbortSignal;
}

export type CircuitStatus = 'closed' | 'open' | 'half-open';

export interface ProviderStatus {
  name: string;
  circuit: CircuitStatus;
}
