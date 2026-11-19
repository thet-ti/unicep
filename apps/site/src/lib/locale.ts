import type { Locale } from '../i18n/ui';

/** Maps a Starlight BCP 47 language tag to one of the site locales. */
export function localeFromLang(lang: string): Locale {
  return lang.toLowerCase().startsWith('pt') ? 'pt-br' : 'en';
}
