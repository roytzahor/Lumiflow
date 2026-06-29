import { formatIlsAmount } from "./formatters";

export type MoneyTone = "positive" | "negative" | "neutral" | "auto";

/**
 * Pure helper — returns the `₪` prefix and the formatted digit string.
 *
 * signed=true  (default): negatives get "-₪" prefix over Math.abs(amount);
 *                         non-negatives get "₪" prefix over amount.
 * signed=false:           always "₪" + formatIlsAmount(amount) as-is.
 */
export function formatMoneyParts(
    amount: number,
    signed: boolean
): { prefix: string; digits: string } {
    if (signed) {
        return {
            prefix: amount >= 0 ? "₪" : "-₪",
            digits: formatIlsAmount(Math.abs(amount)),
        };
    }
    return {
        prefix: "₪",
        digits: formatIlsAmount(amount),
    };
}

/** Pure helper — resolves the Tailwind colour class for a tone + amount pair. */
export function resolveColorClass(tone: MoneyTone, amount: number): string {
    if (tone === "positive") return "text-ios-green";
    if (tone === "negative") return "text-ios-red";
    if (tone === "auto") return amount >= 0 ? "text-ios-green" : "text-ios-red";
    return ""; // neutral: inherits parent colour
}
