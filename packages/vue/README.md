# @unicep/vue

Vue 3 composable for [`@unicep/core`](https://github.com/thet-ti/unicep/tree/main/packages/core):
Brazilian CEP lookup with automatic provider fallback and circuit breakers.

**Documentation:** [unicep.thet.dev](https://unicep.thet.dev) (Portuguese and English) · [provider status](https://unicep.thet.dev/status)

Requires Vue 3.3 or newer.

## Install

```bash
npm install @unicep/vue
```

`@unicep/core` is installed as a dependency.

## Usage

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useCep } from '@unicep/vue';

const cep = ref('');
const { data, error, isLoading } = useCep(cep);
</script>

<template>
  <input v-model="cep" placeholder="00000-000" />
  <p v-if="isLoading">Searching…</p>
  <p v-else-if="error">{{ error.message }}</p>
  <p v-else-if="data">{{ data.street }}, {{ data.neighborhood }} - {{ data.city }}/{{ data.state }}</p>
</template>
```

The lookup runs only when the value is a valid CEP (with or without hyphen), so partial input
is ignored and you can bind the composable straight to a text field. When the CEP changes, the
previous result is dropped and the in-flight request is cancelled.

## API

```ts
useCep(cep: MaybeRefOrGetter<string | null | undefined>, options?: {
  unicep?: Unicep;                      // defaults to a shared instance with all built-in providers
  enabled?: MaybeRefOrGetter<boolean>;  // set to false to pause lookups, default true
}): {
  data: Ref<Address | undefined>;
  error: Ref<Error | undefined>;
  isLoading: Ref<boolean>; // true while a lookup for the current valid CEP is in flight
}
```

`cep` and `enabled` accept a ref, a getter or a plain value. `error` is one of the errors
documented in
[`@unicep/core`](https://github.com/thet-ti/unicep/tree/main/packages/core#errors), such as
`CepNotFoundError` or `AllProvidersFailedError`.

## Custom providers or settings

```ts
import { Unicep, viaCep, brasilApi } from '@unicep/core';

const unicep = new Unicep({ providers: [viaCep(), brasilApi()], timeoutMs: 3000 });

const { data } = useCep(cep, { unicep });
```

Create the instance once, in a module, so circuit breaker state is kept.

## License

[MIT](https://github.com/thet-ti/unicep/blob/main/LICENSE)
