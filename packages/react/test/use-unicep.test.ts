import { renderHook, waitFor } from '@testing-library/react';
import { type Address, getDefaultUnicep, type Unicep } from '@unicep/core';
import { createElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { UnicepProvider, useCep, useUnicep } from '../src/index';

const ADDRESS: Address = {
  cep: '01310100',
  street: 'Avenida Paulista',
  neighborhood: 'Bela Vista',
  city: 'São Paulo',
  state: 'SP',
  provider: 'fake',
};

function fakeUnicep(label = 'fake') {
  const lookup = vi.fn(async (_cep: string, _options?: { signal?: AbortSignal }) => ({
    ...ADDRESS,
    provider: label,
  }));
  return { unicep: { lookup } as unknown as Unicep, lookup };
}

const wrapperFor = (unicep: Unicep) => (props: { children?: ReactNode }) =>
  createElement(UnicepProvider, { unicep }, props.children);

describe('useUnicep', () => {
  it('returns the shared default instance without a provider', () => {
    const { result } = renderHook(() => useUnicep());
    expect(result.current).toBe(getDefaultUnicep());
  });

  it('returns the instance of the nearest provider', () => {
    const { unicep } = fakeUnicep();
    const { result } = renderHook(() => useUnicep(), { wrapper: wrapperFor(unicep) });
    expect(result.current).toBe(unicep);
  });

  it('prefers the inner provider', () => {
    const outer = fakeUnicep('outer').unicep;
    const inner = fakeUnicep('inner').unicep;
    const wrapper = (props: { children?: ReactNode }) =>
      createElement(
        UnicepProvider,
        { unicep: outer },
        createElement(UnicepProvider, { unicep: inner }, props.children),
      );
    const { result } = renderHook(() => useUnicep(), { wrapper });
    expect(result.current).toBe(inner);
  });
});

describe('useCep with a provider', () => {
  it('uses the provided instance when no option is passed', async () => {
    const { unicep, lookup } = fakeUnicep('from-context');
    const { result } = renderHook(() => useCep('01310100'), { wrapper: wrapperFor(unicep) });
    await waitFor(() => expect(result.current.data?.provider).toBe('from-context'));
    expect(lookup).toHaveBeenCalledOnce();
  });

  it('lets the unicep option override the provider', async () => {
    const context = fakeUnicep('from-context');
    const explicit = fakeUnicep('explicit');
    const { result } = renderHook(() => useCep('01310100', { unicep: explicit.unicep }), {
      wrapper: wrapperFor(context.unicep),
    });
    await waitFor(() => expect(result.current.data?.provider).toBe('explicit'));
    expect(context.lookup).not.toHaveBeenCalled();
  });
});
