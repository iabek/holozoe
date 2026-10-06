import type {
  AccountType,
  TransactionType,
} from "./types";

export const ACCOUNT_STORAGE_KEY =
  "life-game-finance-accounts";

export const TRANSACTION_STORAGE_KEY =
  "life-game-finance-transactions";

export const CATEGORY_STORAGE_KEY =
  "life-game-finance-categories";

export const BUDGET_STORAGE_KEY =
  "life-game-finance-budgets";

export const RECURRING_STORAGE_KEY =
  "life-game-finance-recurring";

export const GOAL_STORAGE_KEY =
  "life-game-finance-goals";

export const GOAL_TRANSACTION_STORAGE_KEY =
  "life-game-finance-goal-transactions";

export const accountTypes: {
  value: AccountType;
  label: string;
  icon: string;
}[] = [
  {
    value: "Cash",
    label: "Cash",
    icon: "💵",
  },
  {
    value: "E-Wallet",
    label: "E-Wallet",
    icon: "📱",
  },
  {
    value: "Bank",
    label: "Bank",
    icon: "🏦",
  },
  {
    value: "Credit Card",
    label: "Credit Card",
    icon: "💳",
  },
  {
    value: "Other",
    label: "Other",
    icon: "📦",
  },
];

export const transactionTypes: {
  value: TransactionType;
  label: string;
  icon: string;
}[] = [
  {
    value: "Income",
    label: "Income",
    icon: "💰",
  },
  {
    value: "Expense",
    label: "Expense",
    icon: "💸",
  },
  {
    value: "Transfer",
    label: "Transfer",
    icon: "🔄",
  },
];

export function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function createId() {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

export function getToday() {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

export function getCurrentMonth() {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

export function formatMonth(month: string) {
  const date = new Date(`${month}-01T00:00:00`);

  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function getAccountTypeInfo(
  type: AccountType
) {
  return (
    accountTypes.find(
      (item) => item.value === type
    ) ?? accountTypes[4]
  );
}

export function getTransactionTypeInfo(
  type: TransactionType
) {
  return (
    transactionTypes.find(
      (item) => item.value === type
    ) ?? transactionTypes[0]
  );
}