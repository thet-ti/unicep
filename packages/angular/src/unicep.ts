import { InjectionToken, type Provider } from '@angular/core';
import type { Address } from '@unicep/core';
import { getDefaultUnicep, type Unicep } from '@unicep/core';
import { Observable } from 'rxjs';

/**
 * Injection token for the `Unicep` instance. Defaults to a shared instance with all
 * built-in providers; override it with `provideUnicep`.
 */
export const UNICEP = new InjectionToken<Unicep>('UNICEP', {
  providedIn: 'root',
  factory: () => getDefaultUnicep(),
});

/** Provides a custom `Unicep` instance (custom providers, timeout, circuit breaker...). */
export function provideUnicep(unicep: Unicep): Provider {
  return { provide: UNICEP, useValue: unicep };
}

/**
 * Looks up a CEP as an observable. Unsubscribing cancels the in-flight request without
 * counting against any circuit breaker.
 */
export function lookupCep(unicep: Unicep, cep: string): Observable<Address> {
  return new Observable<Address>((subscriber) => {
    const controller = new AbortController();
    unicep.lookup(cep, { signal: controller.signal }).then(
      (address) => {
        subscriber.next(address);
        subscriber.complete();
      },
      (error: unknown) => {
        if (!controller.signal.aborted) subscriber.error(error);
      },
    );
    return () => controller.abort();
  });
}
