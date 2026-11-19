import { ProviderError } from '../errors';
import type { ProviderAddress } from '../types';

/** Options shared by every built-in provider. */
export interface HttpProviderOptions {
  /** Custom `fetch` implementation (defaults to `globalThis.fetch`). */
  fetch?: typeof globalThis.fetch | undefined;
  /** Overrides the service base URL, e.g. to use a proxy or a self-hosted instance. */
  baseUrl?: string | undefined;
}

export interface JsonResponse {
  status: number;
  ok: boolean;
  /** Parsed JSON body, or `undefined` when the body is not valid JSON. */
  data: unknown;
}

export async function getJson(
  provider: string,
  url: string,
  signal: AbortSignal,
  options: HttpProviderOptions,
): Promise<JsonResponse> {
  let response: Response;
  try {
    response = await (options.fetch ?? globalThis.fetch)(url, {
      signal,
      headers: { accept: 'application/json' },
    });
  } catch (cause) {
    throw new ProviderError(provider, `Request to provider "${provider}" failed`, { cause });
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    data = undefined;
  }
  return { status: response.status, ok: response.ok, data };
}

export function badStatus(provider: string, status: number): ProviderError {
  return new ProviderError(provider, `Provider "${provider}" responded with HTTP ${status}`);
}

export function malformed(provider: string): ProviderError {
  return new ProviderError(provider, `Provider "${provider}" returned an unexpected response`);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Trimmed non-empty string (numbers are stringified), otherwise `undefined`. */
export function text(value: unknown): string | undefined {
  if (typeof value === 'number') return String(value);
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

/**
 * Parses a latitude or longitude (number or numeric string) and checks its range; anything else,
 * including an empty string, is `undefined`.
 */
export function coordinate(value: unknown, limit: 90 | 180): number | undefined {
  const raw = text(value);
  if (raw === undefined) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && Math.abs(parsed) <= limit ? parsed : undefined;
}

export interface AddressParts {
  street?: string | undefined;
  complement?: string | undefined;
  neighborhood?: string | undefined;
  city?: string | undefined;
  state?: string | undefined;
  ibgeCode?: string | undefined;
  latitude?: number | undefined;
  longitude?: number | undefined;
}

/** Builds the normalized address; city and state are mandatory, the rest may be empty. */
export function buildAddress(provider: string, cep: string, parts: AddressParts): ProviderAddress {
  if (!parts.city || !parts.state) throw malformed(provider);
  const hasPosition = parts.latitude !== undefined && parts.longitude !== undefined;
  return {
    cep,
    street: parts.street ?? '',
    complement: parts.complement,
    neighborhood: parts.neighborhood ?? '',
    city: parts.city,
    state: parts.state.toUpperCase(),
    ibgeCode: parts.ibgeCode,
    // Only both together make a usable position.
    latitude: hasPosition ? parts.latitude : undefined,
    longitude: hasPosition ? parts.longitude : undefined,
  };
}
