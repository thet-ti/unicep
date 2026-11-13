import { computed, effect, inject, type Signal, signal } from '@angular/core';
import { type Address, isValidCep, normalizeCep, type Unicep } from '@unicep/core';
import { UNICEP } from './unicep';

export interface InjectCepOptions {
  /** `Unicep` instance to use. Defaults to the one provided through `UNICEP`. */
  unicep?: Unicep | undefined;
  /** Return `false` to pause lookups. Default: always enabled. */
  enabled?: (() => boolean) | undefined;
}

export interface CepResource {
  data: Signal<Address | undefined>;
  error: Signal<Error | undefined>;
  /** `true` while a lookup for the current (valid) CEP is in flight. */
  isLoading: Signal<boolean>;
}

interface Settled {
  key: string;
  data?: Address;
  error?: Error;
}

/**
 * Looks up a CEP whenever the value becomes a valid CEP (with or without hyphen).
 * Partial input is ignored, so it is safe to bind directly to a text field.
 *
 * Must be called in an injection context (e.g. a component or service constructor).
 */
export function injectCep(
  cep: () => string | null | undefined,
  options: InjectCepOptions = {},
): CepResource {
  const unicep = options.unicep ?? inject(UNICEP);
  const settled = signal<Settled | undefined>(undefined);

  const key = computed(() => {
    const value = cep();
    const enabled = options.enabled ? options.enabled() : true;
    return enabled && value && isValidCep(value) ? normalizeCep(value) : undefined;
  });

  effect((onCleanup) => {
    const current = key();
    if (!current) return;

    const controller = new AbortController();
    onCleanup(() => controller.abort());
    unicep.lookup(current, { signal: controller.signal }).then(
      (data) => settled.set({ key: current, data }),
      (reason: unknown) => {
        if (controller.signal.aborted) return;
        const error = reason instanceof Error ? reason : new Error(String(reason));
        settled.set({ key: current, error });
      },
    );
  });

  const current = computed(() => {
    const value = settled();
    return value && value.key === key() ? value : undefined;
  });

  return {
    data: computed(() => current()?.data),
    error: computed(() => current()?.error),
    isLoading: computed(() => key() !== undefined && current() === undefined),
  };
}
