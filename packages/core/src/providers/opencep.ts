import { CepNotFoundError } from '../errors';
import type { CepProvider } from '../types';
import { badStatus, getJson, type HttpProviderOptions, isRecord, malformed } from './http';
import { mapViaCepFormat } from './viacep';

const NAME = 'opencep';

/** [OpenCEP](https://opencep.com) */
export function openCep(options: HttpProviderOptions = {}): CepProvider {
  const baseUrl = options.baseUrl ?? 'https://opencep.com/v1';
  return {
    name: NAME,
    async lookup(cep, { signal }) {
      const response = await getJson(NAME, `${baseUrl}/${cep}`, signal, options);
      if (response.status === 404) throw new CepNotFoundError(cep);
      if (!response.ok) throw badStatus(NAME, response.status);
      if (!isRecord(response.data)) throw malformed(NAME);
      return mapViaCepFormat(NAME, cep, response.data);
    },
  };
}
