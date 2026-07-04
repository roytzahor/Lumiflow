/**
 * Normalise a raw amount string typed by the user before parsing.
 *
 * The iOS Hebrew keyboard emits "," for the decimal separator, which
 * `parseFloat` rejects. The first comma is treated as the decimal point
 * (amounts are never entered with thousands separators in the app).
 */
export function normalizeAmountInput(raw: string): string {
  return raw.trim().replace(',', '.');
}
