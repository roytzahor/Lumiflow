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

/** Minimal user info for “who added this expense” (from `paidByUser` include). */
export type TransactionAddedByUser = {
  id: string;
  name: string | null;
  email: string;
};

/** Feed/list item for transactions, including projected recurring rows */
export type TransactionListItem = (Transaction & { account: Account }) & {
  isRecurring?: boolean;
  isProjected?: boolean;
  paidByUser?: TransactionAddedByUser | null;
};

export type AccountTotal = {
  accountId: string;
  accountName: string;
  total: number;
};

export type BudgetAlert = {
  id: string;
  severity: 'ok' | 'warning' | 'critical';
  message: string;
};

export type DailyNudge = {
  id: string;
  title: string;
  description: string;
  tone: 'neutral' | 'positive' | 'warning';
};

export type CategoryAnomaly = {
  accountName: string;
  category: string;
  currentAmount: number;
  monthlyAverage: number;
  difference: number;
  percentChange: number;
  direction: 'up' | 'down';
};

/** Flat income entry item for use in UI lists */
export type IncomeEntryItem = {
  id: string;
  amount: number;
  description: string | null;
  date: Date;
  accountId: string;
  accountName: string;
};

/** Per-account one-time income total for a given month */
export type MonthlyIncomeTotal = {
  accountId: string;
  totalAmount: number;
};

/** My contribution ratio for a given account */
export type ContributionRatio = {
  accountId: string;
  myAmount: number;
  totalAmount: number;
  ratio: number;
};

/** Category with proportional attribution for "My Money" view */
export type MyMoneyCategory = {
  name: string;
  amount: number;
  source: 'personal' | 'shared';
};

/** Full "My Money" breakdown for the current month */
export type MyMoneyBreakdown = {
  totalIncome: number;
  totalAttributedExpenses: number;
  balance: number;
  categories: MyMoneyCategory[];
};
