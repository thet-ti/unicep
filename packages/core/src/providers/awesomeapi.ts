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

/** [AwesomeAPI CEP](https://docs.awesomeapi.com.br/api-cep) */
export function awesomeApi(options: HttpProviderOptions = {}): CepProvider {
  const baseUrl = options.baseUrl ?? 'https://cep.awesomeapi.com.br/json';
  return {
    name: NAME,
    async lookup(cep, { signal }) {
      const response = await getJson(NAME, `${baseUrl}/${cep}`, signal, options);
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
