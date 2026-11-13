export class UnicepError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** The given value is not a valid 8-digit CEP. */
export class InvalidCepError extends UnicepError {
  readonly input: string;

  constructor(input: string) {
    super(`Invalid CEP: "${input}"`);
    this.input = input;
  }
}

/** The CEP is well formed but the service(s) report that it does not exist. */
export class CepNotFoundError extends UnicepError {
  readonly cep: string;

  constructor(cep: string, options?: ErrorOptions) {
    super(`CEP not found: ${cep}`, options);
    this.cep = cep;
  }
}

/** A provider failed (network, timeout, HTTP 5xx, malformed response...). */
export class ProviderError extends UnicepError {
  readonly provider: string;

  constructor(provider: string, message?: string, options?: ErrorOptions) {
    super(message ?? `Provider "${provider}" failed`, options);
    this.provider = provider;
  }
}

/** The circuit of a provider is open, so it was skipped. */
export class CircuitOpenError extends ProviderError {
  constructor(provider: string) {
    super(provider, `Circuit open for provider "${provider}"`);
  }
}

/** No provider could answer the lookup. */
export class AllProvidersFailedError extends UnicepError {
  readonly cep: string;
  /** One error per provider, in the order they were tried. */
  readonly errors: readonly UnicepError[];

  constructor(cep: string, errors: readonly UnicepError[]) {
    super(`All providers failed for CEP ${cep}`, { cause: errors });
    this.cep = cep;
    this.errors = errors;
  }
}
