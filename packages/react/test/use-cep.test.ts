import { renderHook, waitFor } from '@testing-library/react';
import { type Address, CepNotFoundError, type Unicep } from '@unicep/core';
import { describe, expect, it, vi } from 'vitest';
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
    const { result } = renderHook(() => useCep('0131', { unicep }));
    expect(result.current).toEqual({ data: undefined, error: undefined, isLoading: false });
    expect(lookup).not.toHaveBeenCalled();
  });

  it('looks up a valid CEP and exposes the address', async () => {
    const { unicep, lookup } = fakeUnicep();
    const { result } = renderHook(() => useCep('01310-100', { unicep }));
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.data).toEqual(ADDRESS));
    expect(result.current.isLoading).toBe(false);
    expect(lookup).toHaveBeenCalledWith(
      '01310100',
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it('exposes lookup errors', async () => {
    const error = new CepNotFoundError('01310100');
    const { unicep } = fakeUnicep(() => Promise.reject(error));
    const { result } = renderHook(() => useCep('01310100', { unicep }));
    await waitFor(() => expect(result.current.error).toBe(error));
    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('wraps non-Error rejections', async () => {
    const { unicep } = fakeUnicep(() => Promise.reject('boom'));
    const { result } = renderHook(() => useCep('01310100', { unicep }));
    await waitFor(() => expect(result.current.error?.message).toBe('boom'));
  });

  it('re-queries when the CEP changes and drops the stale result', async () => {
    const { unicep, lookup } = fakeUnicep();
    const { result, rerender } = renderHook(({ cep }) => useCep(cep, { unicep }), {
      initialProps: { cep: '01310100' },
    });
    await waitFor(() => expect(result.current.data).toEqual(ADDRESS));

    rerender({ cep: '20040020' });
    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it('aborts the in-flight lookup when the CEP changes or the hook unmounts', async () => {
    const signals: AbortSignal[] = [];
    const lookup = vi.fn((_cep: string, options?: { signal?: AbortSignal }) => {
      if (options?.signal) signals.push(options.signal);
      return new Promise<Address>(() => {});
    });
    const unicep = { lookup } as unknown as Unicep;
    const { rerender, unmount } = renderHook(({ cep }) => useCep(cep, { unicep }), {
      initialProps: { cep: '01310100' },
    });
    rerender({ cep: '20040020' });
    expect(signals[0]?.aborted).toBe(true);
    unmount();
    expect(signals[1]?.aborted).toBe(true);
  });

  it('does not look up while disabled', () => {
    const { unicep, lookup } = fakeUnicep();
    const { result } = renderHook(() => useCep('01310100', { unicep, enabled: false }));
    expect(result.current.isLoading).toBe(false);
    expect(lookup).not.toHaveBeenCalled();
  });
});
