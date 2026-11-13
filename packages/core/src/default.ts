import { defaultProviders } from './providers';
import { Unicep } from './unicep';

let instance: Unicep | undefined;

/**
 * Shared `Unicep` instance using all built-in providers, created on first use.
 * Sharing it keeps circuit breaker state across the whole app.
 */
export function getDefaultUnicep(): Unicep {
  instance ??= new Unicep({ providers: defaultProviders() });
  return instance;
}
