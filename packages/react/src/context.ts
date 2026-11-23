import { getDefaultUnicep, type Unicep } from '@unicep/core';
import { createContext, createElement, type ReactNode, useContext } from 'react';

const UnicepContext = createContext<Unicep | undefined>(undefined);

export interface UnicepProviderProps {
  /** The instance every `useUnicep()` and `useCep()` below this provider will use. */
  unicep: Unicep;
  children?: ReactNode;
}

/**
 * Makes a configured `Unicep` instance (custom providers, timeout, cache...) available to the
 * whole tree. Create the instance once, outside of components.
 */
export function UnicepProvider({ unicep, children }: UnicepProviderProps) {
  return createElement(UnicepContext.Provider, { value: unicep }, children);
}

/**
 * The `Unicep` instance of the nearest `UnicepProvider`, or the shared default instance when
 * there is none. Use it for imperative lookups, for example inside event handlers:
 *
 * ```ts
 * const unicep = useUnicep();
 * const address = await unicep.lookup(cep);
 * ```
 */
export function useUnicep(): Unicep {
  return useContext(UnicepContext) ?? getDefaultUnicep();
}
