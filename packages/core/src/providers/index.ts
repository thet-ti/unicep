import type { CepProvider } from '../types';
import { awesomeApi } from './awesomeapi';
import { brasilApi } from './brasilapi';
import type { HttpProviderOptions } from './http';
import { openCep } from './opencep';
import { viaCep } from './viacep';

export { type AwesomeApiOptions, awesomeApi } from './awesomeapi';
export { brasilApi } from './brasilapi';
export type { HttpProviderOptions } from './http';
export { openCep } from './opencep';
export { viaCep } from './viacep';

export interface DefaultProvidersOptions extends HttpProviderOptions {
  /** API keys for the providers that accept one. */
  apiKeys?: { awesomeapi?: string | undefined } | undefined;
}

/** All built-in providers, in the recommended priority order. */
export function defaultProviders(options: DefaultProvidersOptions = {}): CepProvider[] {
  const { apiKeys, ...http } = options;
  return [
    viaCep(http),
    brasilApi(http),
    openCep(http),
    awesomeApi({ ...http, apiKey: apiKeys?.awesomeapi }),
  ];
}
