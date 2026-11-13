import { type Address, CepNotFoundError, type Unicep } from '@unicep/core';
import { describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { useCep } from '../src/index';

const ADDRESS: Address = {
  cep: '01310100',
  street: 'Avenida Paulista',
  neighborhood: 'Bela Vista',
  city: 'São Paulo',
  state: 'SP',
  provider: 'fake',
};

function fakeUnicep(impl: (cep: string) => Promise<Address> = async () => ADDRESS) {
  const lookup = vi.fn((cep: string, _options?: { signal?: AbortSignal }) => impl(cep));
  return { unicep: { lookup } as unknown as Unicep, lookup };
}

describe('useCep', () => {
  it('does nothing for empty or partial input', () => {
    const { unicep, lookup } = fakeUnicep();
    const scope = effectScope();
    const result = scope.run(() => useCep('0131', { unicep }));
    expect(result?.isLoading.value).toBe(false);
    expect(result?.data.value).toBeUndefined();
    expect(lookup).not.toHaveBeenCalled();
    scope.stop();
  });

  it('looks up a valid CEP and exposes the address', async () => {
    const { unicep, lookup } = fakeUnicep();
    const result = effectScope().run(() => useCep('01310-100', { unicep }));
    expect(result?.isLoading.value).toBe(true);
    await vi.waitFor(() => expect(result?.data.value).toEqual(ADDRESS));
    expect(result?.isLoading.value).toBe(false);
    expect(lookup).toHaveBeenCalledWith(
      '01310100',
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it('exposes lookup errors', async () => {
    const error = new CepNotFoundError('01310100');
    const { unicep } = fakeUnicep(() => Promise.reject(error));
    const result = effectScope().run(() => useCep('01310100', { unicep }));
    await vi.waitFor(() => expect(result?.error.value).toBe(error));
    expect(result?.data.value).toBeUndefined();
    expect(result?.isLoading.value).toBe(false);
  });

  it('wraps non-Error rejections', async () => {
    const { unicep } = fakeUnicep(() => Promise.reject('boom'));
    const result = effectScope().run(() => useCep('01310100', { unicep }));
    await vi.waitFor(() => expect(result?.error.value?.message).toBe('boom'));
  });

  it('re-queries when the CEP changes and drops the stale result', async () => {
    let release: (address: Address) => void = () => {};
    const { unicep, lookup } = fakeUnicep((cep) =>
      cep === '01310100'
        ? Promise.resolve(ADDRESS)
        : new Promise<Address>((resolve) => {
            release = resolve;
          }),
    );
    const cep = ref('01310100');
    const result = effectScope().run(() => useCep(cep, { unicep }));
    await vi.waitFor(() => expect(result?.data.value).toEqual(ADDRESS));

    cep.value = '20040020';
    await nextTick();
    expect(result?.data.value).toBeUndefined();
    expect(result?.isLoading.value).toBe(true);
    release({ ...ADDRESS, cep: '20040020' });
    await vi.waitFor(() => expect(result?.isLoading.value).toBe(false));
    expect(result?.data.value?.cep).toBe('20040020');
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it('aborts the in-flight lookup when the CEP changes or the scope stops', async () => {
    const signals: AbortSignal[] = [];
    const lookup = vi.fn((_cep: string, options?: { signal?: AbortSignal }) => {
      if (options?.signal) signals.push(options.signal);
      return new Promise<Address>(() => {});
    });
    const unicep = { lookup } as unknown as Unicep;
    const cep = ref('01310100');
    const scope = effectScope();
    scope.run(() => useCep(cep, { unicep }));

    cep.value = '20040020';
    await nextTick();
    expect(signals[0]?.aborted).toBe(true);
    scope.stop();
    expect(signals[1]?.aborted).toBe(true);
  });

  it('does not look up while disabled and reacts to enabled changes', async () => {
    const { unicep, lookup } = fakeUnicep();
    const enabled = ref(false);
    const result = effectScope().run(() => useCep('01310100', { unicep, enabled }));
    expect(result?.isLoading.value).toBe(false);
    expect(lookup).not.toHaveBeenCalled();

    enabled.value = true;
    await vi.waitFor(() => expect(result?.data.value).toEqual(ADDRESS));
  });
});
