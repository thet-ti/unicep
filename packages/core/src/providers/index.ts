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

/** Names of the built-in providers, as used by `defaultProviders({ order })`. */
export const builtInProviderNames = ['viacep', 'brasilapi', 'opencep', 'awesomeapi'] as const;
export type BuiltInProviderName = (typeof builtInProviderNames)[number];

export interface DefaultProvidersOptions extends HttpProviderOptions {
  /** API keys for the providers that accept one. */
  apiKeys?: { awesomeapi?: string | undefined } | undefined;
  /**
   * Providers to try first, in this order: an array or a comma separated string such as
   * `"viacep,brasilapi"` (handy for an environment variable). The remaining default providers
   * follow as fallback. Names are case insensitive.
   */
  order?: string | readonly string[] | undefined;
}

function parseOrder(order: DefaultProvidersOptions['order']): BuiltInProviderName[] {
  if (order === undefined) return [];
  const names = (typeof order === 'string' ? order.split(',') : order)
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean);

  const result: BuiltInProviderName[] = [];
  for (const name of names) {
    if (!(builtInProviderNames as readonly string[]).includes(name)) {
      throw new TypeError(`Unknown provider "${name}". Use: ${builtInProviderNames.join(', ')}`);
    }
    if (!result.includes(name as BuiltInProviderName)) result.push(name as BuiltInProviderName);
  }
  return result;
}

/**
 * The recommended providers, in priority order: ViaCEP, BrasilAPI and OpenCEP.
 *
 * AwesomeAPI is opt-in because it may reject anonymous requests (especially from cloud
 * servers). It is appended last when you pass its key in `apiKeys.awesomeapi`, or you can add
 * `awesomeApi()` to your own provider list.
 *
 * Use `order` to choose which providers come first; the rest follow as fallback.
 */
export function defaultProviders(options: DefaultProvidersOptions = {}): CepProvider[] {
  const { apiKeys, order, ...http } = options;

  const create = (name: BuiltInProviderName): CepProvider => {
    switch (name) {
      case 'viacep':
        return viaCep(http);
      case 'brasilapi':
        return brasilApi(http);
      case 'opencep':
        return openCep(http);
      case 'awesomeapi':
        return awesomeApi({ ...http, apiKey: apiKeys?.awesomeapi });
    }
  };

  const defaults: BuiltInProviderName[] = ['viacep', 'brasilapi', 'opencep'];
  if (apiKeys?.awesomeapi) defaults.push('awesomeapi');

  const first = parseOrder(order);
  const names = [...first, ...defaults.filter((name) => !first.includes(name))];
  return names.map(create);
}
