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

export interface UnicepOptions {
  /** Providers in priority order. */
  providers: readonly CepProvider[];
  /** Per-provider timeout in milliseconds. Default: 5000. */
  timeoutMs?: number;
  circuitBreaker?: CircuitBreakerOptions;
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
