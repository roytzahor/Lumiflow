/**
 * Unit tests for the money rendering helpers (lib/money.ts) used by the
 * <Money> component. These pure helpers hold all formatting/sign/colour logic.
 */
import { describe, it, expect } from "vitest";
import { formatMoneyParts, resolveColorClass } from "../lib/money";

// ---------------------------------------------------------------------------
// formatMoneyParts
// ---------------------------------------------------------------------------

describe("formatMoneyParts — signed=true (default)", () => {
  it("positive amount: prefix is ₪", () => {
    const { prefix } = formatMoneyParts(100, true);
    expect(prefix).toBe("₪");
  });

  it("positive amount: digits are formatted without decimals", () => {
    const { digits } = formatMoneyParts(100, true);
    expect(digits).toBe("100");
  });

  it("zero: prefix is ₪", () => {
    const { prefix } = formatMoneyParts(0, true);
    expect(prefix).toBe("₪");
  });

  it("zero: digits are 0", () => {
    const { digits } = formatMoneyParts(0, true);
    expect(digits).toBe("0");
  });

  it("negative amount: prefix is -₪", () => {
    const { prefix } = formatMoneyParts(-250, true);
    expect(prefix).toBe("-₪");
  });

  it("negative amount: digits are the absolute value formatted (no leading minus)", () => {
    const { digits } = formatMoneyParts(-250, true);
    expect(digits).toBe("250");
  });

  it("rounds fractional amount up (1.7 → 2)", () => {
    const { digits } = formatMoneyParts(1.7, true);
    expect(digits).toBe("2");
  });

  it("rounds fractional amount down (1.4 → 1)", () => {
    const { digits } = formatMoneyParts(1.4, true);
    expect(digits).toBe("1");
  });

  it("rounds negative fractional amount (abs applied first: -1.7 → 2)", () => {
    const { digits } = formatMoneyParts(-1.7, true);
    expect(digits).toBe("2");
  });
});

describe("formatMoneyParts — signed=false", () => {
  it("positive amount: prefix is always ₪", () => {
    expect(formatMoneyParts(100, false).prefix).toBe("₪");
  });

  it("positive amount: digits are formatted correctly", () => {
    expect(formatMoneyParts(50, false).digits).toBe("50");
  });

  it("negative amount: prefix is still ₪ (no -₪)", () => {
    expect(formatMoneyParts(-100, false).prefix).toBe("₪");
  });

  it("zero: prefix is ₪", () => {
    expect(formatMoneyParts(0, false).prefix).toBe("₪");
  });
});

// ---------------------------------------------------------------------------
// resolveColorClass
// ---------------------------------------------------------------------------

describe("resolveColorClass — tone=auto", () => {
  it("positive amount → text-ios-green", () => {
    expect(resolveColorClass("auto", 100)).toBe("text-ios-green");
  });

  it("zero → text-ios-green (≥0 rule)", () => {
    expect(resolveColorClass("auto", 0)).toBe("text-ios-green");
  });

  it("negative amount → text-ios-red", () => {
    expect(resolveColorClass("auto", -100)).toBe("text-ios-red");
  });
});

describe("resolveColorClass — explicit tones", () => {
  it("tone=positive → text-ios-green regardless of amount sign", () => {
    expect(resolveColorClass("positive", -500)).toBe("text-ios-green");
    expect(resolveColorClass("positive", 500)).toBe("text-ios-green");
  });

  it("tone=negative → text-ios-red regardless of amount sign", () => {
    expect(resolveColorClass("negative", 500)).toBe("text-ios-red");
    expect(resolveColorClass("negative", -500)).toBe("text-ios-red");
  });

  it("tone=neutral → empty string (inherits parent colour)", () => {
    expect(resolveColorClass("neutral", 100)).toBe("");
    expect(resolveColorClass("neutral", -100)).toBe("");
  });
});
