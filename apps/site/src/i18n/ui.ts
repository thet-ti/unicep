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
        'Consulta de CEP para navegador e Node.js com fallback automático entre ViaCEP, BrasilAPI, OpenCEP e AwesomeAPI.',
      eyebrow: 'Biblioteca de CEP',
      title: 'Consulta de CEP com fallback automático.',
      subtitle:
        'Uma única API para ViaCEP, BrasilAPI, OpenCEP e AwesomeAPI. Quando um serviço cai, a unicep troca para o próximo sozinha e sempre devolve o mesmo objeto.',
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
          text: 'Núcleo em TypeScript puro, com bindings para React, Vue e Angular.',
        },
        {
          title: 'Feita para agentes',
          text: 'llms.txt, páginas em Markdown e prompts prontos para implementar com IA.',
        },
      ],
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
        'CEP lookup for browsers and Node.js with automatic fallback between ViaCEP, BrasilAPI, OpenCEP and AwesomeAPI.',
      eyebrow: 'CEP library',
      title: 'CEP lookup with automatic fallback.',
      subtitle:
        'One API for ViaCEP, BrasilAPI, OpenCEP and AwesomeAPI. When a service goes down, unicep switches to the next one on its own and always returns the same object.',
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
    },
  },
};
