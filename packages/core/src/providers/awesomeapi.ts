import { CepNotFoundError } from '../errors';
import type { CepProvider } from '../types';
import {
  badStatus,
  buildAddress,
  getJson,
  type HttpProviderOptions,
  isRecord,
  malformed,
  text,
} from './http';

const NAME = 'awesomeapi';

export interface AwesomeApiOptions extends HttpProviderOptions {
  /**
   * AwesomeAPI API key. Sent as the `token` query parameter (no CORS preflight). The service may
   * rate limit or reject anonymous requests, especially from cloud providers. Never ship a
   * private key to browsers: use it on the server or behind your own proxy.
   */
  apiKey?: string | undefined;
}

/** [AwesomeAPI CEP](https://docs.awesomeapi.com.br/api-cep) */
export function awesomeApi(options: AwesomeApiOptions = {}): CepProvider {
  const baseUrl = options.baseUrl ?? 'https://cep.awesomeapi.com.br/json';
  const query = options.apiKey ? `?token=${encodeURIComponent(options.apiKey)}` : '';
  return {
    name: NAME,
    async lookup(cep, { signal }) {
      const response = await getJson(NAME, `${baseUrl}/${cep}${query}`, signal, options);
      if (response.status === 404) throw new CepNotFoundError(cep);
      if (!response.ok) throw badStatus(NAME, response.status);
      const data = response.data;
      if (!isRecord(data)) throw malformed(NAME);
      return buildAddress(NAME, cep, {
        street: text(data.address),
        neighborhood: text(data.district),
        city: text(data.city),
        state: text(data.state),
        ibgeCode: text(data.city_ibge),
      });
    },
  };
}
