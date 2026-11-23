import { formatPlaceName } from '../localities';
import type { City, LocalityProvider, State } from '../types';
import { badStatus, getJson, type HttpProviderOptions, isRecord, malformed, text } from './http';

/** Maps every item of a JSON array; a bad item, or an empty list, makes the response malformed. */
function mapList<T>(
  provider: string,
  data: unknown,
  map: (item: Record<string, unknown>) => T | undefined,
): T[] {
  if (!Array.isArray(data) || data.length === 0) throw malformed(provider);
  return data.map((item) => {
    const mapped = isRecord(item) ? map(item) : undefined;
    if (mapped === undefined) throw malformed(provider);
    return mapped;
  });
}

function toState(item: Record<string, unknown>): State | undefined {
  const uf = text(item.sigla);
  const name = text(item.nome);
  return typeof item.id === 'number' && uf && name ? { id: item.id, uf, name } : undefined;
}

/**
 * States and cities from [BrasilAPI](https://brasilapi.com.br). It uses the same provider name
 * (and circuit breaker) as `brasilApi()`, since both hit the same service.
 */
export function brasilApiLocalities(options: HttpProviderOptions = {}): LocalityProvider {
  const NAME = 'brasilapi';
  const baseUrl = options.baseUrl ?? 'https://brasilapi.com.br/api/ibge';
  return {
    name: NAME,
    async states({ signal }) {
      const response = await getJson(NAME, `${baseUrl}/uf/v1`, signal, options);
      if (!response.ok) throw badStatus(NAME, response.status);
      return mapList(NAME, response.data, toState);
    },
    async cities(uf, { signal }) {
      const response = await getJson(NAME, `${baseUrl}/municipios/v1/${uf}`, signal, options);
      if (!response.ok) throw badStatus(NAME, response.status);
      return mapList<City>(NAME, response.data, (item) => {
        const name = text(item.nome);
        const ibgeCode = text(item.codigo_ibge);
        return name && ibgeCode ? { name: formatPlaceName(name), ibgeCode } : undefined;
      });
    },
  };
}

/** States and cities from the [IBGE localities API](https://servicodados.ibge.gov.br/api/docs/localidades). */
export function ibge(options: HttpProviderOptions = {}): LocalityProvider {
  const NAME = 'ibge';
  const baseUrl = options.baseUrl ?? 'https://servicodados.ibge.gov.br/api/v1/localidades';
  return {
    name: NAME,
    async states({ signal }) {
      const response = await getJson(NAME, `${baseUrl}/estados?orderBy=nome`, signal, options);
      if (!response.ok) throw badStatus(NAME, response.status);
      return mapList(NAME, response.data, toState);
    },
    async cities(uf, { signal }) {
      const response = await getJson(
        NAME,
        `${baseUrl}/estados/${uf}/municipios?orderBy=nome`,
        signal,
        options,
      );
      if (!response.ok) throw badStatus(NAME, response.status);
      return mapList<City>(NAME, response.data, (item) => {
        const name = text(item.nome);
        const ibgeCode = text(item.id);
        return name && ibgeCode ? { name: formatPlaceName(name), ibgeCode } : undefined;
      });
    },
  };
}

/**
 * The default locality providers, in priority order: BrasilAPI, then IBGE. Only `fetch` is
 * shared, because each service has its own base URL.
 */
export function defaultLocalityProviders(options: HttpProviderOptions = {}): LocalityProvider[] {
  const shared = { fetch: options.fetch };
  return [brasilApiLocalities(shared), ibge(shared)];
}
