import { type Address, isValidCep, normalizeCep, type Unicep } from '@unicep/core';
import { useEffect, useState } from 'react';
import { useUnicep } from './context';

export interface UseCepOptions {
  /**
   * `Unicep` instance to use. Defaults to the one from the nearest `UnicepProvider`, or to a
   * shared instance with the default providers.
   */
  unicep?: Unicep | undefined;
  /** Set to `false` to pause lookups. Default: `true`. */
  enabled?: boolean | undefined;
}

export interface UseCepResult {
  data: Address | undefined;
  error: Error | undefined;
  /** `true` while a lookup for the current (valid) CEP is in flight. */
  isLoading: boolean;
}

interface Settled {
  key: string;
  data?: Address;
  error?: Error;
}

/**
 * Looks up a CEP whenever the value becomes a valid CEP (with or without hyphen).
 * Partial input is ignored, so it is safe to bind directly to a text field.
 */
export function useCep(cep: string | null | undefined, options: UseCepOptions = {}): UseCepResult {
  const contextual = useUnicep();
  const { unicep = contextual, enabled = true } = options;
  const key = enabled && cep && isValidCep(cep) ? normalizeCep(cep) : undefined;
  const [settled, setSettled] = useState<Settled>();

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    unicep.lookup(key, { signal: controller.signal }).then(
      (data) => setSettled({ key, data }),
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setSettled({ key, error: error instanceof Error ? error : new Error(String(error)) });
      },
    );
    return () => controller.abort();
  }, [key, unicep]);

  const current = settled?.key === key ? settled : undefined;
  return {
    data: current?.data,
    error: current?.error,
    isLoading: key !== undefined && current === undefined,
  };
}
