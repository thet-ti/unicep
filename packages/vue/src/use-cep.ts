import {
  type Address,
  getDefaultUnicep,
  isValidCep,
  normalizeCep,
  type Unicep,
} from '@unicep/core';
import { computed, type MaybeRefOrGetter, type Ref, shallowRef, toValue, watch } from 'vue';

export interface UseCepOptions {
  /** `Unicep` instance to use. Defaults to a shared instance with all built-in providers. */
  unicep?: Unicep | undefined;
  /** Set to `false` to pause lookups. Accepts a ref or getter. Default: `true`. */
  enabled?: MaybeRefOrGetter<boolean> | undefined;
}

export interface UseCepResult {
  data: Ref<Address | undefined>;
  error: Ref<Error | undefined>;
  /** `true` while a lookup for the current (valid) CEP is in flight. */
  isLoading: Ref<boolean>;
}

/**
 * Looks up a CEP whenever the value becomes a valid CEP (with or without hyphen).
 * Partial input is ignored, so it is safe to bind directly to a text field.
 */
export function useCep(
  cep: MaybeRefOrGetter<string | null | undefined>,
  options: UseCepOptions = {},
): UseCepResult {
  const data = shallowRef<Address>();
  const error = shallowRef<Error>();
  const isLoading = shallowRef(false);

  const key = computed(() => {
    const value = toValue(cep);
    const enabled = options.enabled === undefined ? true : toValue(options.enabled);
    return enabled && value && isValidCep(value) ? normalizeCep(value) : undefined;
  });

  watch(
    key,
    (current, _previous, onCleanup) => {
      data.value = undefined;
      error.value = undefined;
      isLoading.value = current !== undefined;
      if (!current) return;

      const controller = new AbortController();
      onCleanup(() => controller.abort());
      (options.unicep ?? getDefaultUnicep()).lookup(current, { signal: controller.signal }).then(
        (address) => {
          data.value = address;
          isLoading.value = false;
        },
        (reason: unknown) => {
          if (controller.signal.aborted) return;
          error.value = reason instanceof Error ? reason : new Error(String(reason));
          isLoading.value = false;
        },
      );
    },
    { immediate: true },
  );

  return { data, error, isLoading };
}
