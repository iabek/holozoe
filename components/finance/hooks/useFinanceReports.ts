import { useMemo } from "react";
import type { FinanceAccount, FinanceGoalTransaction, FinanceTransaction } from "../types";

type Props = {
  accounts: FinanceAccount[];
  transactions: FinanceTransaction[];
  goalTransactions: FinanceGoalTransaction[];
  selectedMonth: string;
};

export default function useFinanceReports({
  accounts,
  transactions,
  goalTransactions,
  selectedMonth,
}: Props) {
  const accountBalances = useMemo(() => {
    const balances: Record<string, number> = {};

    accounts.forEach((account) => {
      balances[account.id] = account.initialBalance;
    });

    transactions.forEach((transaction) => {
      if (transaction.type === "Income" && transaction.accountId) {
        balances[transaction.accountId] =
          (balances[transaction.accountId] ?? 0) + transaction.amount;
      }

      if (transaction.type === "Expense" && transaction.accountId) {
        balances[transaction.accountId] =
          (balances[transaction.accountId] ?? 0) - transaction.amount;
      }

      if (transaction.type === "Transfer") {
        if (transaction.fromAccountId) {
          balances[transaction.fromAccountId] =
            (balances[transaction.fromAccountId] ?? 0) - transaction.amount;
        }
        if (transaction.toAccountId) {
          balances[transaction.toAccountId] =
            (balances[transaction.toAccountId] ?? 0) + transaction.amount;
        }
      }
    });

    goalTransactions.forEach((transaction) => {
      if (transaction.type === "Contribution") {
        balances[transaction.accountId] =
          (balances[transaction.accountId] ?? 0) - transaction.amount;
      }
      if (transaction.type === "Withdrawal") {
        balances[transaction.accountId] =
          (balances[transaction.accountId] ?? 0) + transaction.amount;
      }
    });

    return balances;
  }, [accounts, transactions, goalTransactions]);

  const totalBalance = accounts.reduce(
    (total, account) => total + (accountBalances[account.id] ?? 0),
    0
  );

  const totalIncome = transactions
    .filter((t) => t.type === "Income")
    .reduce((total, t) => total + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === "Expense")
    .reduce((total, t) => total + t.amount, 0);

  const monthlyTransactions = useMemo(
    () => transactions.filter((t) => t.date.slice(0, 7) === selectedMonth),
    [transactions, selectedMonth]
  );

  const monthlyIncome = monthlyTransactions
    .filter((t) => t.type === "Income")
    .reduce((total, t) => total + t.amount, 0);

  const monthlyExpense = monthlyTransactions
    .filter((t) => t.type === "Expense")
    .reduce((total, t) => total + t.amount, 0);

  const monthlyExpenseByCategory = useMemo(() => {
    const grouped: Record<string, number> = {};
    monthlyTransactions
      .filter((t) => t.type === "Expense")
      .forEach((t) => {
        const name = t.category.trim() || "Uncategorized";
        grouped[name] = (grouped[name] ?? 0) + t.amount;
      });
    return Object.entries(grouped).sort((a, b) => b[1] - a[1]);
  }, [monthlyTransactions]);

  const monthlyIncomeByCategory = useMemo(() => {
    const grouped: Record<string, number> = {};
    monthlyTransactions
      .filter((t) => t.type === "Income")
      .forEach((t) => {
        const name = t.category.trim() || "Uncategorized";
        grouped[name] = (grouped[name] ?? 0) + t.amount;
      });
    return Object.entries(grouped).sort((a, b) => b[1] - a[1]);
  }, [monthlyTransactions]);

  const monthlyExpenseByCategoryData = monthlyExpenseByCategory.map(
    ([name, amount]) => ({
      name,
      amount,
      percentage: monthlyExpense > 0 ? (amount / monthlyExpense) * 100 : 0,
    })
  );

  const monthlyIncomeByCategoryData = monthlyIncomeByCategory.map(
    ([name, amount]) => ({
      name,
      amount,
      percentage: monthlyIncome > 0 ? (amount / monthlyIncome) * 100 : 0,
    })
  );

  const largestExpenseCategory = monthlyExpenseByCategory[0];
  const largestExpenseAmount = largestExpenseCategory?.[1] ?? 0;

  return {
    accountBalances,
    totalBalance,
    totalIncome,
    totalExpense,
    monthlyTransactions,
    monthlyIncome,
    monthlyExpense,
    monthlyNet: monthlyIncome - monthlyExpense,
    monthlyExpenseByCategory,
    monthlyIncomeByCategory,
    monthlyExpenseByCategoryData,
    monthlyIncomeByCategoryData,
    largestExpenseCategory,
    largestExpenseAmount,
  };
}
