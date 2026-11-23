# @unicep/react

React hook for [`@unicep/core`](https://github.com/thet-ti/unicep/tree/main/packages/core):
Brazilian CEP lookup with automatic provider fallback and circuit breakers.

**Documentation:** [unicep.thet.dev](https://unicep.thet.dev) (Portuguese and English) · [provider status](https://unicep.thet.dev/status)

Requires React 18 or newer.

## Install

```bash
npm install @unicep/react
```

`@unicep/core` is installed as a dependency.

## Usage

```tsx
import { useState } from 'react';
import { useCep } from '@unicep/react';

export function CepField() {
  const [value, setValue] = useState('');
  const { data, error, isLoading } = useCep(value);

  return (
    <>
      <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="00000-000" />
      {isLoading && <p>Searching…</p>}
      {error && <p>{error.message}</p>}
      {data && (
        <p>
          {data.street}, {data.neighborhood} - {data.city}/{data.state}
        </p>
      )}
    </>
  );
}
```

The lookup runs only when the value is a valid CEP (with or without hyphen), so partial input
is ignored and you can bind the hook straight to a text field. When the CEP changes, the previous
result is dropped and the in-flight request is cancelled.

## API

```ts
useCep(cep: string | null | undefined, options?: {
  unicep?: Unicep;    // defaults to a shared instance with all built-in providers
  enabled?: boolean;  // set to false to pause lookups, default true
}): {
  data: Address | undefined;
  error: Error | undefined;
  isLoading: boolean; // true while a lookup for the current valid CEP is in flight
}
```

`error` is one of the errors documented in
[`@unicep/core`](https://github.com/thet-ti/unicep/tree/main/packages/core#errors), such as
`CepNotFoundError` or `AllProvidersFailedError`.

## Global provider and `useUnicep`

Wrap the app in a `UnicepProvider` to give every `useCep` (and `useUnicep`) below it a configured
instance. `useUnicep()` returns that instance for imperative lookups, and falls back to the shared
default instance when there is no provider:

```tsx
import { Unicep, defaultProviders } from '@unicep/core';
import { UnicepProvider, useUnicep } from '@unicep/react';

const unicep = new Unicep({ providers: defaultProviders(), cache: {} });

root.render(
  <UnicepProvider unicep={unicep}>
    <App />
  </UnicepProvider>,
);

// inside a component
const instance = useUnicep();
const address = await instance.lookup(cep);
```

## Custom providers or settings

```tsx
import { Unicep, viaCep, brasilApi } from '@unicep/core';

const unicep = new Unicep({ providers: [viaCep(), brasilApi()], timeoutMs: 3000 });

const { data } = useCep(value, { unicep });
```

Create the instance once, outside the component, so circuit breaker state is kept.

## License

[MIT](https://github.com/thet-ti/unicep/blob/main/LICENSE)
