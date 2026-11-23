import type { Locale } from '../i18n/ui';

export type Framework = 'react' | 'vue' | 'angular' | 'node';

export const frameworkNames: Record<Framework, string> = {
  react: 'React',
  vue: 'Vue',
  angular: 'Angular',
  node: 'Node.js',
};

/** Short, framework specific API summary, so the prompt is useful even without network access. */
const apiSummary: Record<Framework, string[]> = {
  react: [
    'npm install @unicep/react',
    "import { useCep } from '@unicep/react';",
    'const { data, error, isLoading } = useCep(value); // data is an Address; the lookup runs only for a valid CEP',
    'Options: useCep(value, { unicep, enabled })',
  ],
  vue: [
    'npm install @unicep/vue',
    "import { useCep } from '@unicep/vue';",
    'const { data, error, isLoading } = useCep(cepRef); // refs; the lookup runs only for a valid CEP',
    'Options: useCep(cepRef, { unicep, enabled })',
  ],
  angular: [
    'npm install @unicep/angular',
    "import { injectCep, provideUnicep, UNICEP } from '@unicep/angular';",
    'readonly cep = injectCep(() => this.value()); // signals: cep.data(), cep.error(), cep.isLoading()',
    'Also: lookupCep(unicep, cep) returns an Observable; provideUnicep(new Unicep({...})) customizes the instance',
  ],
  node: [
    'npm install @unicep/core',
    "import { Unicep, defaultProviders } from '@unicep/core';",
    'const unicep = new Unicep({ providers: defaultProviders(), cache: {} }); // create once and reuse',
    'const address = await unicep.lookup(cep); // accepts 01310-100 or 01310100',
  ],
};

const requirements: Record<Locale, Record<Framework, string[]>> = {
  'pt-br': {
    react: [
      'Um campo de CEP com máscara 00000-000 que busca o endereço sozinho quando o CEP estiver completo.',
      'Preencha rua, bairro, cidade e UF com o resultado e mostre estados de carregamento e de erro.',
      'Mostre mensagens diferentes para "CEP não encontrado" e "serviços indisponíveis".',
      'Crie a instância do Unicep uma única vez (fora do componente), com cache ligado.',
    ],
    vue: [
      'Um campo de CEP com máscara 00000-000 que busca o endereço sozinho quando o CEP estiver completo.',
      'Preencha rua, bairro, cidade e UF com o resultado e mostre estados de carregamento e de erro.',
      'Mostre mensagens diferentes para "CEP não encontrado" e "serviços indisponíveis".',
      'Crie a instância do Unicep uma única vez, num módulo, com cache ligado.',
    ],
    angular: [
      'Um campo de CEP com máscara 00000-000 que busca o endereço sozinho quando o CEP estiver completo.',
      'Preencha rua, bairro, cidade e UF com o resultado e mostre estados de carregamento e de erro.',
      'Mostre mensagens diferentes para "CEP não encontrado" e "serviços indisponíveis".',
      'Configure o Unicep uma única vez com provideUnicep, com cache ligado.',
    ],
    node: [
      'Um endpoint GET /cep/:cep que devolve o endereço em JSON.',
      'Responda 400 para CEP inválido, 404 para "CEP não encontrado" e 503 quando todos os serviços falharem.',
      'Crie a instância do Unicep uma única vez, com cache ligado, e cancele a consulta se o cliente desconectar.',
    ],
  },
  en: {
    react: [
      'A CEP field with a 00000-000 mask that fetches the address on its own once the CEP is complete.',
      'Fill in street, neighborhood, city and state from the result, and show loading and error states.',
      'Show different messages for "CEP not found" and "services unavailable".',
      'Create the Unicep instance once (outside the component), with the cache enabled.',
    ],
    vue: [
      'A CEP field with a 00000-000 mask that fetches the address on its own once the CEP is complete.',
      'Fill in street, neighborhood, city and state from the result, and show loading and error states.',
      'Show different messages for "CEP not found" and "services unavailable".',
      'Create the Unicep instance once, in a module, with the cache enabled.',
    ],
    angular: [
      'A CEP field with a 00000-000 mask that fetches the address on its own once the CEP is complete.',
      'Fill in street, neighborhood, city and state from the result, and show loading and error states.',
      'Show different messages for "CEP not found" and "services unavailable".',
      'Configure Unicep once with provideUnicep, with the cache enabled.',
    ],
    node: [
      'A GET /cep/:cep endpoint that returns the address as JSON.',
      'Respond 400 for an invalid CEP, 404 for "CEP not found" and 503 when every service fails.',
      'Create the Unicep instance once, with the cache enabled, and cancel the lookup if the client disconnects.',
    ],
  },
};

const copy = {
  'pt-br': {
    intro: (name: string) =>
      `Implemente a consulta de CEP no meu projeto ${name} usando a biblioteca unicep.`,
    docs: 'Documentação completa (leia primeiro):',
    api: 'Resumo da API:',
    errors:
      'Erros (importe de @unicep/core): InvalidCepError, CepNotFoundError, AllProvidersFailedError.',
    need: 'O que eu preciso:',
    outro: 'Siga as convenções do meu projeto e explique o que você alterou.',
  },
  en: {
    intro: (name: string) => `Implement CEP lookup in my ${name} project using the unicep library.`,
    docs: 'Full documentation (read it first):',
    api: 'API summary:',
    errors:
      'Errors (import from @unicep/core): InvalidCepError, CepNotFoundError, AllProvidersFailedError.',
    need: 'What I need:',
    outro: 'Follow my project conventions and explain what you changed.',
  },
} satisfies Record<Locale, Record<string, unknown>>;

/** Builds a ready-to-paste prompt that asks an AI agent to implement unicep in a project. */
export function buildPrompt(framework: Framework, locale: Locale, docsUrl: string): string {
  const c = copy[locale];
  return [
    c.intro(frameworkNames[framework]),
    '',
    `${c.docs} ${docsUrl}`,
    '',
    c.api,
    ...apiSummary[framework].map((line) => `- ${line}`),
    `- ${c.errors}`,
    '',
    c.need,
    ...requirements[locale][framework].map((line, index) => `${index + 1}. ${line}`),
    '',
    c.outro,
  ].join('\n');
}

const genericCopy = {
  'pt-br': {
    intro:
      'Implemente a consulta de CEP no meu projeto usando a biblioteca unicep. Antes de escrever código, identifique o framework do projeto (olhe o package.json e a estrutura de pastas) e instale o pacote certo. Se você não tiver acesso ao meu código, pergunte qual framework eu uso.',
    packages: 'Pacotes:',
    need: 'O que eu preciso:',
    requirements: [
      'Um campo de CEP com máscara 00000-000 que busca o endereço sozinho quando o CEP estiver completo.',
      'Preencha rua, bairro, cidade e UF com o resultado e mostre estados de carregamento e de erro.',
      'Mostre mensagens diferentes para "CEP não encontrado" e "serviços indisponíveis".',
      'Crie a instância do Unicep uma única vez, com cache ligado.',
    ],
  },
  en: {
    intro:
      'Implement CEP lookup in my project using the unicep library. Before writing code, identify the framework the project uses (check package.json and the folder structure) and install the right package. If you cannot access my code, ask me which framework I use.',
    packages: 'Packages:',
    need: 'What I need:',
    requirements: [
      'A CEP field with a 00000-000 mask that fetches the address on its own once the CEP is complete.',
      'Fill in street, neighborhood, city and state from the result, and show loading and error states.',
      'Show different messages for "CEP not found" and "services unavailable".',
      'Create the Unicep instance once, with the cache enabled.',
    ],
  },
} satisfies Record<Locale, unknown>;

/** Builds a prompt that assumes no framework: the agent picks the package that fits the project. */
export function buildGenericPrompt(locale: Locale, docsUrl: string): string {
  const c = genericCopy[locale];
  const k = copy[locale];
  return [
    c.intro,
    '',
    `${k.docs} ${docsUrl}`,
    '',
    c.packages,
    '- React: npm install @unicep/react (useCep)',
    '- Vue: npm install @unicep/vue (useCep)',
    '- Angular: npm install @unicep/angular (injectCep, provideUnicep)',
    '- Node.js / other: npm install @unicep/core (new Unicep({ providers: defaultProviders(), cache: {} }).lookup(cep))',
    `- ${k.errors}`,
    '',
    c.need,
    ...c.requirements.map((line, index) => `${index + 1}. ${line}`),
    '',
    k.outro,
  ].join('\n');
}

export function claudeUrl(prompt: string): string {
  return `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;
}

export function chatgptUrl(prompt: string): string {
  return `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`;
}
