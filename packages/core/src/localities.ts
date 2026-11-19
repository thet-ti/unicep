/** The 27 Brazilian federative units (UF). */
export const ufs = [
  'AC',
  'AL',
  'AM',
  'AP',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MG',
  'MS',
  'MT',
  'PA',
  'PB',
  'PE',
  'PI',
  'PR',
  'RJ',
  'RN',
  'RO',
  'RR',
  'RS',
  'SC',
  'SE',
  'SP',
  'TO',
] as const;

export type Uf = (typeof ufs)[number];

/** Upper-cased UF, or `undefined` when the input is not a valid state abbreviation. */
export function normalizeUf(input: string): Uf | undefined {
  const uf = input.trim().toUpperCase();
  return (ufs as readonly string[]).includes(uf) ? (uf as Uf) : undefined;
}

export function isValidUf(input: string): boolean {
  return normalizeUf(input) !== undefined;
}

const LOWERCASE_WORDS = new Set(['d', 'da', 'das', 'de', 'do', 'dos', 'e']);

/**
 * Some services return place names in capitals ("ÁGUAS DE LINDÓIA"); this turns them into
 * "Águas de Lindóia". Names that already have lower case letters are left untouched.
 */
export function formatPlaceName(name: string): string {
  if (name !== name.toUpperCase() || name === name.toLowerCase()) return name;
  return name
    .toLowerCase()
    .replace(/\p{L}+/gu, (word, offset: number) =>
      offset > 0 && LOWERCASE_WORDS.has(word)
        ? word
        : `${word.charAt(0).toUpperCase()}${word.slice(1)}`,
    );
}

/** Sorts by name, ignoring accents and case, the way a Brazilian reader expects. */
export function byName<T extends { name: string }>(a: T, b: T): number {
  return a.name.localeCompare(b.name, 'pt-BR');
}
