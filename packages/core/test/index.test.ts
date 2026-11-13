import { describe, expect, it } from 'vitest';
import { VERSION } from '../src/index';

describe('core', () => {
  it('exposes a version', () => {
    expect(VERSION).toBe('0.0.0');
  });
});
