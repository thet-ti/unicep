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
  /** Latitude in decimal degrees, when the provider exposes it (always together with `longitude`). */
  latitude?: number | undefined;
  /** Longitude in decimal degrees, when the provider exposes it (always together with `latitude`). */
  longitude?: number | undefined;
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
  /**
   * When a lookup fails, still try the providers that were skipped because their circuit is
   * open, as a last resort and in priority order. A success closes that provider's circuit.
   * Without it, open circuits fail fast and the user waits for `resetTimeoutMs`. Default: false.
   */
  lastResort?: boolean;
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

/** A Brazilian state (UF). */
export interface State {
  /** IBGE code, e.g. `35`. */
  id: number;
  /** Two-letter abbreviation, e.g. `SP`. */
  uf: string;
  name: string;
}

/** A Brazilian municipality. */
export interface City {
  name: string;
  /** 7-digit IBGE municipality code, e.g. `3550308`. */
  ibgeCode: string;
}

/**
 * Adapter for a service that lists states and cities. Providers that share a `name` with a
 * `CepProvider` (for example `brasilapi`) share its circuit breaker.
 */
export interface LocalityProvider {
  readonly name: string;
  states(context: LookupContext): Promise<State[]>;
  /** `uf` is always a valid, upper case abbreviation. */
  cities(uf: string, context: LookupContext): Promise<City[]>;
}

export interface LocalitiesOptions {
  /** Providers in priority order. Default: BrasilAPI, then IBGE. */
  providers?: readonly LocalityProvider[];
  /**
   * Caches states and cities in memory (they almost never change). Pass `false` to disable.
   * Default: 24 hours.
   */
  cache?: CacheOptions | false;
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
  /** Where `states()` and `cities()` get their data. */
  localities?: LocalitiesOptions;
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
