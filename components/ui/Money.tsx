import { cn } from "@/lib/utils";
import { formatMoneyParts, resolveColorClass, type MoneyTone } from "@/lib/money";

interface MoneyProps {
    amount: number;
    tone?: MoneyTone;
    signed?: boolean;
    className?: string;
}

/**
 * Presentational ILS currency component — the single place currency is rendered.
 *
 *   amount    — integer ILS amount
 *   tone      — "positive" | "negative" | "neutral" | "auto"  (default "neutral")
 *               "auto" derives colour from sign (≥0 green, <0 red);
 *               "neutral" inherits the surrounding colour
 *   signed    — when true (default), renders "-₪" for negatives and "₪" for
 *               non-negatives over the absolute value; when false, renders
 *               "₪" + formatIlsAmount(amount) as-is
 *   className — merged via cn() (tailwind-merge + clsx)
 *
 * Always includes tabular-nums. No business logic beyond formatting/sign/colour.
 */
export default function Money({ amount, tone = "neutral", signed = true, className }: MoneyProps) {
    const { prefix, digits } = formatMoneyParts(amount, signed);
    return (
        <span className={cn("tabular-nums", resolveColorClass(tone, amount), className)}>
            {prefix}
            {digits}
        </span>
    );
}
