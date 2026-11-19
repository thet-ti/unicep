export const locales = ['pt-br', 'en'] as const;
export type Locale = (typeof locales)[number];

/** The library is Brazilian, so Portuguese is served at the root. */
export const defaultLocale: Locale = 'pt-br';

/** Path of the status page in each locale. */
export const paths: Record<Locale, string> = {
  'pt-br': '/',
  en: '/en/',
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
  github: string;
  npm: (version: string) => string;
  language: string;
  motd: string;
  openSource: string;
  license: string;
}

export const messages: Record<Locale, Messages> = {
  'pt-br': {
    description: 'Status em tempo real dos provedores de CEP usados pela unicep.',
    eyebrow: 'Status',
    heading: 'Status dos provedores',
    allOperational: 'Todos os provedores estão operacionais',
    allDown: 'Todos os provedores estão fora do ar',
    someDown: (down, total) => `${down} de ${total} provedores fora do ar`,
    online: 'Online',
    offline: 'Offline',
    latency: 'Latência',
    circuitBreaker: 'Circuit breaker',
    circuit: { closed: 'Fechado', open: 'Aberto', 'half-open': 'Meio-aberto' },
    lastChecked: 'Última verificação',
    openInNewTab: 'abre em uma nova aba',
    github: 'unicep no GitHub',
    npm: (version) => `@unicep/core ${version} no npm`,
    language: 'Idioma',
    motd: 'A única forma de procurar um CEP...',
    openSource: 'Código aberto',
    license: 'sob a licença MIT.',
  },
  en: {
    description: 'Live status of the CEP providers used by unicep.',
    eyebrow: 'Status',
    heading: 'Provider status',
    allOperational: 'All providers are operational',
    allDown: 'All providers are down',
    someDown: (down, total) => `${down} of ${total} providers are down`,
    online: 'Online',
    offline: 'Offline',
    latency: 'Latency',
    circuitBreaker: 'Circuit breaker',
    circuit: { closed: 'Closed', open: 'Open', 'half-open': 'Half-open' },
    lastChecked: 'Last checked',
    openInNewTab: 'opens in a new tab',
    github: 'unicep on GitHub',
    npm: (version) => `@unicep/core ${version} on npm`,
    language: 'Language',
    motd: 'The only way to look up a CEP...',
    openSource: 'Open source',
    license: 'under the MIT license.',
  },
};
