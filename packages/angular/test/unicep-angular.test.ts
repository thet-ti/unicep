import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { type Address, CepNotFoundError, type Unicep } from '@unicep/core';
import { firstValueFrom } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { injectCep, lookupCep, provideUnicep, UNICEP } from '../src/index';

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

function setup(cep: () => string | null | undefined, unicep: Unicep, enabled?: () => boolean) {
  return TestBed.runInInjectionContext(() => injectCep(cep, { unicep, enabled }));
}

const settle = async () => {
  TestBed.tick();
  await Promise.resolve();
  await Promise.resolve();
  TestBed.tick();
};

describe('UNICEP token', () => {
  it('defaults to the shared instance and can be overridden', () => {
    const { unicep } = fakeUnicep();
    expect(TestBed.inject(UNICEP).status().length).toBe(3);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideUnicep(unicep)] });
    expect(TestBed.inject(UNICEP)).toBe(unicep);
  });
});

describe('injectCep', () => {
  it('does nothing for empty or partial input', async () => {
    const { unicep, lookup } = fakeUnicep();
    const result = setup(() => '0131', unicep);
    await settle();
    expect(result.isLoading()).toBe(false);
    expect(result.data()).toBeUndefined();
    expect(lookup).not.toHaveBeenCalled();
  });

  it('looks up a valid CEP and exposes the address', async () => {
    const { unicep, lookup } = fakeUnicep();
    const result = setup(() => '01310-100', unicep);
    expect(result.isLoading()).toBe(true);
    await settle();
    expect(result.data()).toEqual(ADDRESS);
    expect(result.isLoading()).toBe(false);
    expect(lookup).toHaveBeenCalledWith(
      '01310100',
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it('exposes lookup errors and wraps non-Error rejections', async () => {
    const error = new CepNotFoundError('01310100');
    const a = setup(() => '01310100', fakeUnicep(() => Promise.reject(error)).unicep);
    const b = setup(() => '01310100', fakeUnicep(() => Promise.reject('boom')).unicep);
    await settle();
    expect(a.error()).toBe(error);
    expect(a.data()).toBeUndefined();
    expect(b.error()?.message).toBe('boom');
    expect(a.isLoading()).toBe(false);
  });

  it('re-queries when the CEP changes, aborting the previous lookup', async () => {
    const signals: AbortSignal[] = [];
    const lookup = vi.fn((cep: string, options?: { signal?: AbortSignal }) => {
      if (options?.signal) signals.push(options.signal);
      return cep === '01310100'
        ? new Promise<Address>(() => {})
        : Promise.resolve({ ...ADDRESS, cep });
    });
    const input = signal('01310100');
    const result = setup(input, { lookup } as unknown as Unicep);
    await settle();
    expect(result.isLoading()).toBe(true);

    input.set('20040020');
    await settle();
    expect(signals[0]?.aborted).toBe(true);
    expect(result.data()?.cep).toBe('20040020');
    expect(result.isLoading()).toBe(false);
  });

  it('does not look up while disabled', async () => {
    const { unicep, lookup } = fakeUnicep();
    const enabled = signal(false);
    const result = setup(() => '01310100', unicep, enabled);
    await settle();
    expect(result.isLoading()).toBe(false);
    expect(lookup).not.toHaveBeenCalled();

    enabled.set(true);
    await settle();
    expect(result.data()).toEqual(ADDRESS);
  });

  it('falls back to the UNICEP token when no instance is given', async () => {
    const { unicep, lookup } = fakeUnicep();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideUnicep(unicep)] });
    const result = TestBed.runInInjectionContext(() => injectCep(() => '01310100'));
    await settle();
    expect(result.data()).toEqual(ADDRESS);
    expect(lookup).toHaveBeenCalledOnce();
  });
});

describe('lookupCep', () => {
  it('emits the address and completes', async () => {
    const { unicep } = fakeUnicep();
    await expect(firstValueFrom(lookupCep(unicep, '01310100'))).resolves.toEqual(ADDRESS);
  });

  it('errors with the lookup error', async () => {
    const error = new CepNotFoundError('01310100');
    const { unicep } = fakeUnicep(() => Promise.reject(error));
    await expect(firstValueFrom(lookupCep(unicep, '01310100'))).rejects.toBe(error);
  });

  it('aborts the lookup on unsubscribe', () => {
    let signal: AbortSignal | undefined;
    const lookup = vi.fn((_cep: string, options?: { signal?: AbortSignal }) => {
      signal = options?.signal;
      return new Promise<Address>(() => {});
    });
    const subscription = lookupCep({ lookup } as unknown as Unicep, '01310100').subscribe();
    subscription.unsubscribe();
    expect(signal?.aborted).toBe(true);
  });
});
