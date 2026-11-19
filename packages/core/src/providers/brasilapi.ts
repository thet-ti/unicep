import { CepNotFoundError } from '../errors';
import type { CepProvider } from '../types';
import {
  badStatus,
  buildAddress,
  coordinate,
  getJson,
  type HttpProviderOptions,
  isRecord,
  malformed,
  text,
} from './http';

const NAME = 'brasilapi';

/** [BrasilAPI](https://brasilapi.com.br) (CEP v2) */
export function brasilApi(options: HttpProviderOptions = {}): CepProvider {
  const baseUrl = options.baseUrl ?? 'https://brasilapi.com.br/api/cep/v2';
  return {
    name: NAME,
    async lookup(cep, { signal }) {
      const response = await getJson(NAME, `${baseUrl}/${cep}`, signal, options);
      if (response.status === 404) throw new CepNotFoundError(cep);
      if (!response.ok) throw badStatus(NAME, response.status);
      const data = response.data;
      if (!isRecord(data)) throw malformed(NAME);
      const coordinates = isRecord(data.location) ? data.location.coordinates : undefined;
      return buildAddress(NAME, cep, {
        street: text(data.street),
        neighborhood: text(data.neighborhood),
        city: text(data.city),
        state: text(data.state),
        ibgeCode: isRecord(data.ibge) ? text(data.ibge.city) : undefined,
        latitude: isRecord(coordinates) ? coordinate(coordinates.latitude, 90) : undefined,
        longitude: isRecord(coordinates) ? coordinate(coordinates.longitude, 180) : undefined,
      });
    },
  };
}
