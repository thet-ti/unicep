import { CepNotFoundError } from '../errors';
import type { CepProvider, ProviderAddress } from '../types';
import {
  badStatus,
  buildAddress,
  getJson,
  type HttpProviderOptions,
  isRecord,
  malformed,
  text,
} from './http';

const NAME = 'viacep';

/** Maps the ViaCEP response format (also used by OpenCEP). */
export function mapViaCepFormat(
  provider: string,
  cep: string,
  data: Record<string, unknown>,
): ProviderAddress {
  return buildAddress(provider, cep, {
    street: text(data.logradouro),
    complement: text(data.complemento),
    neighborhood: text(data.bairro),
    city: text(data.localidade),
    state: text(data.uf),
    ibgeCode: text(data.ibge),
  });
}

/** [ViaCEP](https://viacep.com.br) */
export function viaCep(options: HttpProviderOptions = {}): CepProvider {
  const baseUrl = options.baseUrl ?? 'https://viacep.com.br/ws';
  return {
    name: NAME,
    async lookup(cep, { signal }) {
      const response = await getJson(NAME, `${baseUrl}/${cep}/json/`, signal, options);
      if (!response.ok) throw badStatus(NAME, response.status);
      if (!isRecord(response.data)) throw malformed(NAME);
      // ViaCEP answers 200 with `{ "erro": "true" }` for unknown CEPs.
      if (response.data.erro === true || response.data.erro === 'true') {
        throw new CepNotFoundError(cep);
      }
      return mapViaCepFormat(NAME, cep, response.data);
    },
  };
}
