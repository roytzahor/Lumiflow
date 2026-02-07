import type {
  Account,
  Transaction,
  Category,
  BudgetSettings,
  RecurringTransaction,
} from "@prisma/client";

// Re-export Prisma models for app use
export type { Account, Category, BudgetSettings };

/** Transaction with account relation (from findMany with include: { account: true }) */
export type TransactionWithAccount = Transaction & { account: Account };

/** Recurring transaction with account relation */
export type RecurringWithAccount = RecurringTransaction & { account: Account };
