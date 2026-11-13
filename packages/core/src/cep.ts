const CEP_PATTERN = /^\d{5}-?\d{3}$/;

/** Strips everything but digits (`"01310-100"` -> `"01310100"`). */
export function normalizeCep(input: string): string {
  return input.replace(/\D/g, '');
}

/** Whether the input is a CEP, with or without the hyphen (`01310100` or `01310-100`). */
export function isValidCep(input: string): boolean {
  return CEP_PATTERN.test(input.trim());
}

/** Formats a CEP with mask (`"01310100"` -> `"01310-100"`). Returns the input if invalid. */
export function formatCep(input: string): string {
  if (!isValidCep(input)) return input;
  const digits = normalizeCep(input);
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}
