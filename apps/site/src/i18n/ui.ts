export const locales = ['pt-br', 'en'] as const;
export type Locale = (typeof locales)[number];

/** The library is Brazilian, so Portuguese is served at the root. */
export const defaultLocale: Locale = 'pt-br';

export type RouteName = 'home' | 'status' | 'docs';

/** Path of each top-level page in each locale. */
export const routes: Record<RouteName, Record<Locale, string>> = {
  home: { 'pt-br': '/', en: '/en/' },
  status: { 'pt-br': '/status', en: '/en/status' },
  docs: { 'pt-br': '/docs/getting-started', en: '/en/docs/getting-started' },
};

/** BCP 47 tag for `<html lang>` and `Intl`. */
export const htmlLang: Record<Locale, string> = {
  'pt-br': 'pt-BR',
  en: 'en',
};

export const languageNames: Record<Locale, { short: string; full: string }> = {
  'pt-br': { short: 'PT', full: 'Português' },
  en: { short: 'EN', full: 'English' },
};

export interface Messages {
  /** Shared chrome. */
  nav: { docs: string; status: string };
  github: string;
  npm: (version: string) => string;
  language: string;
  motd: string;

  /** Home page. */
  home: {
    description: string;
    eyebrow: string;
    title: string;
    subtitle: string;
    readDocs: string;
    viewStatus: string;
    install: string;
    example: string;
    features: { title: string; text: string }[];
    /** Short answer to "how do I look up a CEP with automatic fallback". */
    useCase: { title: string; paragraphs: string[]; points: string[] };
    /** Longer description for structured data. */
    jsonLdDescription: string;
    /** Buttons that send a ready-made prompt to an AI assistant. */
    ai: { label: string; claude: string; chatgpt: string };
  };

  /** Status page. */
  status: {
    description: string;
    eyebrow: string;
    heading: string;
    allOperational: string;
    allDown: string;
    someDown: (down: number, total: number) => string;
    online: string;
    offline: string;
    latency: string;
    circuitBreaker: string;
    circuit: { closed: string; open: string; 'half-open': string };
    lastChecked: string;
    openInNewTab: string;
    /** Tag shown on providers that need an API key. */
    keyRequired: string;
    /** Badge for a provider that was not checked because no key is configured. */
    notChecked: string;
  };
}

export const messages: Record<Locale, Messages> = {
  'pt-br': {
    nav: { docs: 'Docs', status: 'Status' },
    github: 'unicep no GitHub',
    npm: (version) => `@unicep/core ${version} no npm`,
    language: 'Idioma',
    motd: 'A Única Forma de Procurar um CEP.',
    home: {
      description:
        'Biblioteca TypeScript de consulta de CEP para navegador e Node.js, com fallback automático entre ViaCEP, BrasilAPI e OpenCEP (AwesomeAPI opcional, com chave de API).',
      eyebrow: 'Biblioteca de CEP',
      title: 'Consulta de CEP com fallback automático.',
      subtitle:
        'Uma única API para ViaCEP, BrasilAPI e OpenCEP (e AwesomeAPI, opcional, com chave de API). Quando um serviço cai, a unicep troca para o próximo sozinha e sempre devolve o mesmo objeto.',
      readDocs: 'Ler a documentação',
      viewStatus: 'Ver status dos provedores',
      install: 'Instalação',
      example: 'Exemplo',
      features: [
        {
          title: 'Fallback automático',
          text: 'Tenta os provedores em ordem e devolve sempre o mesmo objeto Address.',
        },
        {
          title: 'Circuit breaker',
          text: 'Detecta serviços instáveis e pula o provedor até ele se recuperar.',
        },
        {
          title: 'Pronta para o seu framework',
          text: 'Core em TypeScript puro, com bindings para React, Vue e Angular.',
        },
        {
          title: 'Feita para agentes',
          text: 'llms.txt, páginas em Markdown e prompts prontos para implementar com IA.',
        },
      ],
      useCase: {
        title: 'Como consultar CEP com fallback automático no navegador e no Node.js?',
        paragraphs: [
          'Use a @unicep/core. Ela consulta ViaCEP, BrasilAPI e OpenCEP por uma única função, lookup(cep). Se um serviço cair ou ficar lento, um circuit breaker o pula e a próxima API responde, sempre com o mesmo objeto Address (cep, street, neighborhood, city, state).',
          'Funciona no navegador e no Node.js 20 ou superior, sem dependências exclusivas do Node no core. Para React, Vue e Angular existem os pacotes @unicep/react, @unicep/vue e @unicep/angular.',
        ],
        points: [
          'Quando usar: formulários de endereço, checkout e cadastros em que a consulta de CEP não pode falhar só porque o ViaCEP caiu.',
          'O AwesomeAPI também é suportado, mas é opcional e exige chave de API; use apenas no servidor.',
        ],
      },
      jsonLdDescription:
        'Biblioteca TypeScript de consulta de CEP para navegador e Node.js. Consulta ViaCEP, BrasilAPI e OpenCEP por uma única API, detecta serviços fora do ar com circuit breaker e troca para o próximo provedor automaticamente, sempre devolvendo o mesmo objeto Address. AwesomeAPI é opcional e exige chave de API.',
      ai: {
        label: 'Implementar com IA:',
        claude: 'Implementar com Claude',
        chatgpt: 'Implementar com ChatGPT',
      },
    },
    status: {
      description: 'Status em tempo real dos provedores de CEP usados pela unicep.',
      eyebrow: 'Status',
      heading: 'Status dos provedores',
      allOperational: 'Totalmente Operacional',
      allDown: 'Todos os provedores estão fora do ar',
      someDown: (down, total) => `${down} de ${total} provedores fora do ar`,
      online: 'Online',
      offline: 'Offline',
      latency: 'Latência',
      circuitBreaker: 'Circuit breaker',
      circuit: { closed: 'Fechado', open: 'Aberto', 'half-open': 'Meio-aberto' },
      lastChecked: 'Última verificação',
      openInNewTab: 'abre em uma nova aba',
      keyRequired: 'Requer chave de API',
      notChecked: 'Sem chave',
    },
  },
  en: {
    nav: { docs: 'Docs', status: 'Status' },
    github: 'unicep on GitHub',
    npm: (version) => `@unicep/core ${version} on npm`,
    language: 'Language',
    motd: 'The Only Way to Look Up a CEP.',
    home: {
      description:
        'TypeScript library for Brazilian CEP lookup in browsers and Node.js, with automatic fallback between ViaCEP, BrasilAPI and OpenCEP (AwesomeAPI optional, needs an API key).',
      eyebrow: 'CEP library',
      title: 'CEP lookup with automatic fallback.',
      subtitle:
        'One API for ViaCEP, BrasilAPI and OpenCEP (plus AwesomeAPI, optional, with an API key). When a service goes down, unicep switches to the next one on its own and always returns the same object.',
      readDocs: 'Read the docs',
      viewStatus: 'View provider status',
      install: 'Install',
      example: 'Example',
      features: [
        {
          title: 'Automatic fallback',
          text: 'Tries the providers in order and always returns the same Address object.',
        },
        {
          title: 'Circuit breaker',
          text: 'Detects unstable services and skips the provider until it recovers.',
        },
        {
          title: 'Ready for your framework',
          text: 'Plain TypeScript core with bindings for React, Vue and Angular.',
        },
        {
          title: 'Built for agents',
          text: 'llms.txt, Markdown pages and ready-made prompts to implement with AI.',
        },
      ],
      useCase: {
        title:
          'How do I look up a Brazilian CEP with automatic fallback in the browser and Node.js?',
        paragraphs: [
          'Use @unicep/core. It queries ViaCEP, BrasilAPI and OpenCEP through a single function, lookup(cep). When a service goes down or gets slow, a circuit breaker skips it and the next API answers, always with the same Address object (cep, street, neighborhood, city, state).',
          'It runs in browsers and Node.js 20 or later, with no Node-only APIs in the core. For React, Vue and Angular there are @unicep/react, @unicep/vue and @unicep/angular.',
        ],
        points: [
          'When to use it: address forms, checkouts and sign-ups where the CEP lookup must not fail just because ViaCEP is down.',
          'AwesomeAPI is also supported, but it is optional and needs an API key; use it on the server only.',
        ],
      },
      jsonLdDescription:
        'TypeScript library for Brazilian CEP (postal code) lookup in browsers and Node.js. It queries ViaCEP, BrasilAPI and OpenCEP through one API, detects failing services with circuit breakers and switches to the next provider automatically, always returning the same Address object. AwesomeAPI is optional and needs an API key.',
      ai: {
        label: 'Implement with AI:',
        claude: 'Implement with Claude',
        chatgpt: 'Implement with ChatGPT',
      },
    },
    status: {
      description: 'Live status of the CEP providers used by unicep.',
      eyebrow: 'Status',
      heading: 'Provider status',
      allOperational: 'Fully Operational',
      allDown: 'All providers are down',
      someDown: (down, total) => `${down} of ${total} providers are down`,
      online: 'Online',
      offline: 'Offline',
      latency: 'Latency',
      circuitBreaker: 'Circuit breaker',
      circuit: { closed: 'Closed', open: 'Open', 'half-open': 'Half-open' },
      lastChecked: 'Last checked',
      openInNewTab: 'opens in a new tab',
      keyRequired: 'API key required',
      notChecked: 'No key',
    },
  },
};
