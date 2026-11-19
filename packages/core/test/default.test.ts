import { describe, expect, it } from 'vitest';
import { getDefaultUnicep, Unicep } from '../src/index';

describe('getDefaultUnicep', () => {
  it('returns a shared Unicep with the default providers', () => {
    const instance = getDefaultUnicep();
    expect(instance).toBeInstanceOf(Unicep);
    expect(getDefaultUnicep()).toBe(instance);
    expect(instance.status().map((s) => s.name)).toEqual(['viacep', 'brasilapi', 'opencep']);
  });
});
