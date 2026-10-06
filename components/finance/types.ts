export type AccountType =
  | "Cash"
  | "E-Wallet"
  | "Bank"
  | "Credit Card"
  | "Other";

export type FinanceAccount = {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  createdAt: string;
};

export type TransactionType =
  | "Income"
  | "Expense"
  | "Transfer";

export type FinanceTransaction = {
  id: string;
  type: TransactionType;
  accountId?: string;
  fromAccountId?: string;
  toAccountId?: string;
  amount: number;
  category: string;
  note: string;
  date: string;
  createdAt: string;
};

export type CategoryType =
  | "Income"
  | "Expense";

export type FinanceCategory = {
  id: string;
  name: string;
  type: CategoryType;
  createdAt: string;
};

export type FinanceBudget = {
  id: string;
  month: string;
  category: string;
  amount: number;
  createdAt: string;
};

export type FinanceRecurring = {
  id: string;
  type: "Income" | "Expense";
  accountId: string;
  amount: number;
  category: string;
  note: string;
  dayOfMonth: number;
  active: boolean;
  createdAt: string;
  generatedMonths: string[];
};

export type FinanceGoal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type FinanceGoalTransaction = {
  id: string;
  goalId: string;
  type: "Contribution" | "Withdrawal";
  amount: number;
  accountId: string;
  date: string;
  note: string;
  createdAt: string;
};