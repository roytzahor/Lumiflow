import type {
  Account,
  Transaction,
  Category,
  BudgetSettings,
  RecurringTransaction,
  AccountInvite,
  AccountMember,
  AccountType,
  AccountMemberRole,
  RecurringMonthPolicy,
} from "@prisma/client";

// Re-export Prisma models for app use
export type {
  Account,
  Category,
  BudgetSettings,
  AccountInvite,
  AccountMember,
  AccountType,
  AccountMemberRole,
  RecurringMonthPolicy,
};

/** Transaction with account relation (from findMany with include: { account: true }) */
export type TransactionWithAccount = Transaction & { account: Account };

/** Recurring transaction with account relation */
export type RecurringWithAccount = RecurringTransaction & { account: Account };

/** Feed/list item for transactions, including projected recurring rows */
export type TransactionListItem = (Transaction & { account: Account }) & {
  isRecurring?: boolean;
  isProjected?: boolean;
};

export type AccountTotal = {
  accountId: string;
  accountName: string;
  total: number;
};
