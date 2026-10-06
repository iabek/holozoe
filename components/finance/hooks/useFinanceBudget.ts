import { useEffect, useMemo, useState } from "react";
import type {
  FinanceBudget,
  FinanceCategory,
  FinanceTransaction,
} from "../types";
import {
  BUDGET_STORAGE_KEY,
  createId,
  getCurrentMonth,
} from "../utils";
import { saveCurrentLifeGameStorage } from "@/lib/life-game-storage";

type Props = {
  transactions: FinanceTransaction[];
  expenseCategories: FinanceCategory[];
  selectedMonth: string;
};

const NEW_BUDGET_ID = "__new__";

export default function useFinanceBudget({
  transactions,
  expenseCategories,
  selectedMonth,
}: Props) {
  const [budgets, setBudgets] = useState<FinanceBudget[]>([]);
  const [editingBudgetId, setEditingBudgetId] =
    useState<string | null>(null);
  const [budgetMonth, setBudgetMonth] =
    useState(getCurrentMonth());
  const [budgetCategory, setBudgetCategory] =
    useState("");
  const [budgetAmount, setBudgetAmount] =
    useState("");
  const [budgetError, setBudgetError] =
    useState("");

  useEffect(() => {
    const saved = localStorage.getItem(
      BUDGET_STORAGE_KEY
    );

    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);

      if (Array.isArray(parsed)) {
        setBudgets(parsed);
      }
    } catch {
      setBudgets([]);
    }
  }, []);

  function notifyUpdate() {
    window.dispatchEvent(
      new Event("life-game-updated")
    );
  }

  async function saveBudgets(
    updated: FinanceBudget[]
  ) {
    setBudgets(updated);

    localStorage.setItem(
      BUDGET_STORAGE_KEY,
      JSON.stringify(updated)
    );

    notifyUpdate();

    const result =
      await saveCurrentLifeGameStorage(
        BUDGET_STORAGE_KEY
      );

    if (!result.success) {
      console.error(
        "Gagal menyimpan finance budgets ke Supabase:",
        result
      );
    }
  }

  function openAddBudget() {
    setEditingBudgetId(NEW_BUDGET_ID);
    setBudgetMonth(selectedMonth);
    setBudgetCategory(
      expenseCategories[0]?.name ?? ""
    );
    setBudgetAmount("");
    setBudgetError("");
  }

  function openEditBudget(
    budget: FinanceBudget
  ) {
    setEditingBudgetId(budget.id);
    setBudgetMonth(budget.month);
    setBudgetCategory(budget.category);
    setBudgetAmount(String(budget.amount));
    setBudgetError("");
  }

  function cancelBudgetEditor() {
    setEditingBudgetId(null);
    setBudgetMonth(selectedMonth);
    setBudgetCategory("");
    setBudgetAmount("");
    setBudgetError("");
  }

  function saveBudget() {
    if (!/^\d{4}-\d{2}$/.test(budgetMonth)) {
      setBudgetError(
        "Month budget tidak valid."
      );
      return;
    }

    if (!budgetCategory) {
      setBudgetError(
        "Pilih category terlebih dahulu."
      );
      return;
    }

    const parsedAmount =
      Number(budgetAmount);

    if (
      !budgetAmount.trim() ||
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0
    ) {
      setBudgetError(
        "Masukkan nominal budget yang valid."
      );
      return;
    }

    const isNewBudget =
      editingBudgetId === NEW_BUDGET_ID;

    const existingBudgetId =
      editingBudgetId && !isNewBudget
        ? editingBudgetId
        : null;

    const duplicate = budgets.some(
      (budget) =>
        budget.id !== existingBudgetId &&
        budget.month === budgetMonth &&
        budget.category
          .trim()
          .toLowerCase() ===
          budgetCategory
            .trim()
            .toLowerCase()
    );

    if (duplicate) {
      setBudgetError(
        "Budget untuk category dan bulan tersebut sudah ada."
      );
      return;
    }

    const old = existingBudgetId
      ? budgets.find(
          (budget) =>
            budget.id === existingBudgetId
        )
      : undefined;

    const cleanBudget: FinanceBudget = {
      id:
        existingBudgetId ??
        createId(),
      month: budgetMonth,
      category:
        budgetCategory.trim(),
      amount:
        Math.floor(parsedAmount),
      createdAt:
        old?.createdAt ??
        new Date().toISOString(),
    };

    if (existingBudgetId) {
      saveBudgets(
        budgets.map((budget) =>
          budget.id === existingBudgetId
            ? cleanBudget
            : budget
        )
      );
    } else {
      saveBudgets([
        cleanBudget,
        ...budgets,
      ]);
    }

    cancelBudgetEditor();
  }

  function deleteBudget(
    budget: FinanceBudget
  ) {
    if (
      !window.confirm(
        `Hapus budget ${budget.category} untuk ${budget.month}?`
      )
    ) {
      return;
    }

    saveBudgets(
      budgets.filter(
        (item) =>
          item.id !== budget.id
      )
    );

    if (
      editingBudgetId === budget.id
    ) {
      cancelBudgetEditor();
    }
  }

  const budgetRows = useMemo(
    () =>
      budgets.map((budget) => {
        const spent = transactions
          .filter(
            (transaction) =>
              transaction.type ===
                "Expense" &&
              transaction.date.slice(
                0,
                7
              ) === budget.month &&
              transaction.category
                .trim()
                .toLowerCase() ===
                budget.category
                  .trim()
                  .toLowerCase()
          )
          .reduce(
            (total, transaction) =>
              total +
              transaction.amount,
            0
          );

        const remaining =
          budget.amount - spent;

        const usage =
          budget.amount > 0
            ? (spent /
                budget.amount) *
              100
            : 0;

        return {
          ...budget,
          spent,
          remaining,
          usage,
        };
      }),
    [budgets, transactions]
  );

  return {
    budgets,
    budgetRows,
    editingBudgetId,
    budgetMonth,
    budgetCategory,
    budgetAmount,
    budgetError,
    openAddBudget,
    openEditBudget,
    cancelBudgetEditor,
    saveBudget,
    deleteBudget,
    setBudgetMonth,
    setBudgetCategory,
    setBudgetAmount,
  };
}