import { describe, expect, it } from 'vitest';
import { formatCep, isValidCep, normalizeCep } from '../src/index';

describe('cep helpers', () => {
  it('normalizes masked and unmasked values', () => {
    expect(normalizeCep('01310-100')).toBe('01310100');
    expect(normalizeCep('01310100')).toBe('01310100');
  });

  it('validates CEPs', () => {
    expect(isValidCep('01310100')).toBe(true);
    expect(isValidCep('01310-100')).toBe(true);
    expect(isValidCep(' 01310-100 ')).toBe(true);
    expect(isValidCep('1310-100')).toBe(false);
    expect(isValidCep('013101000')).toBe(false);
    expect(isValidCep('01310-10a')).toBe(false);
    expect(isValidCep('')).toBe(false);
  });

  it('formats valid CEPs and leaves invalid ones untouched', () => {
    expect(formatCep('01310100')).toBe('01310-100');
    expect(formatCep('01310-100')).toBe('01310-100');
    expect(formatCep('abc')).toBe('abc');
  });
});
