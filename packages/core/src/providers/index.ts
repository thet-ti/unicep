import type { CepProvider } from '../types';
import { awesomeApi } from './awesomeapi';
import { brasilApi } from './brasilapi';
import type { HttpProviderOptions } from './http';
import { openCep } from './opencep';
import { viaCep } from './viacep';

export { awesomeApi } from './awesomeapi';
export { brasilApi } from './brasilapi';
export type { HttpProviderOptions } from './http';
export { openCep } from './opencep';
export { viaCep } from './viacep';

/** All built-in providers, in the recommended priority order. */
export function defaultProviders(options: HttpProviderOptions = {}): CepProvider[] {
  return [viaCep(options), brasilApi(options), openCep(options), awesomeApi(options)];
}
