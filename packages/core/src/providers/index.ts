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

/**
 * The recommended providers, in priority order: ViaCEP, BrasilAPI and OpenCEP.
 *
 * AwesomeAPI is opt-in because it may reject anonymous requests (especially from cloud
 * servers). It is appended last when you pass its key in `apiKeys.awesomeapi`, or you can add
 * `awesomeApi()` to your own provider list.
 */
export function defaultProviders(options: DefaultProvidersOptions = {}): CepProvider[] {
  const { apiKeys, ...http } = options;
  const providers = [viaCep(http), brasilApi(http), openCep(http)];
  if (apiKeys?.awesomeapi) {
    providers.push(awesomeApi({ ...http, apiKey: apiKeys.awesomeapi }));
  }
  return providers;
}
