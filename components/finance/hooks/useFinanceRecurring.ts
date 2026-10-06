import { useEffect, useState } from "react";
import type {
  FinanceAccount,
  FinanceCategory,
  FinanceRecurring,
  FinanceTransaction,
} from "../types";
import {
  RECURRING_STORAGE_KEY,
  createId,
} from "../utils";
import { saveCurrentLifeGameStorage } from "@/lib/life-game-storage";

type RecurringType =
  | "Income"
  | "Expense";

type Props = {
  accounts: FinanceAccount[];
  expenseCategories: FinanceCategory[];
  incomeCategories: FinanceCategory[];
  selectedMonth: string;
  transactions: FinanceTransaction[];
  saveTransactions: (
    items: FinanceTransaction[]
  ) => void;
};

export default function useFinanceRecurring({
  accounts,
  expenseCategories,
  incomeCategories,
  selectedMonth,
  transactions,
  saveTransactions,
}: Props) {
  const [recurring, setRecurring] =
    useState<FinanceRecurring[]>([]);

  const [
    editingRecurringId,
    setEditingRecurringId,
  ] = useState<string | null>(
    null
  );

  const [
    recurringType,
    setRecurringType,
  ] = useState<RecurringType>(
    "Expense"
  );

  const [
    recurringAccountId,
    setRecurringAccountId,
  ] = useState("");

  const [
    recurringAmount,
    setRecurringAmount,
  ] = useState("");

  const [
    recurringCategory,
    setRecurringCategory,
  ] = useState("");

  const [
    recurringNote,
    setRecurringNote,
  ] = useState("");

  const [
    recurringDay,
    setRecurringDay,
  ] = useState("1");

  const [
    recurringError,
    setRecurringError,
  ] = useState("");

  useEffect(() => {
    const saved =
      localStorage.getItem(
        RECURRING_STORAGE_KEY
      );

    if (!saved) return;

    try {
      const parsed =
        JSON.parse(saved);

      if (Array.isArray(parsed)) {
        setRecurring(parsed);
      }
    } catch {
      setRecurring([]);
    }
  }, []);

  function notifyUpdate() {
    window.dispatchEvent(
      new Event("life-game-updated")
    );
  }

  async function saveRecurring(
    updated: FinanceRecurring[]
  ) {
    setRecurring(updated);

    localStorage.setItem(
      RECURRING_STORAGE_KEY,
      JSON.stringify(updated)
    );

    notifyUpdate();

    const result =
      await saveCurrentLifeGameStorage(
        RECURRING_STORAGE_KEY
      );

    if (!result.success) {
      console.error(
        "Gagal menyimpan finance recurring ke Supabase:",
        result
      );
    }
  }

  function resetRecurringEditor() {
    setEditingRecurringId(null);
    setRecurringType("Expense");

    setRecurringAccountId(
      accounts[0]?.id ?? ""
    );

    setRecurringAmount("");

    setRecurringCategory(
      expenseCategories[0]?.name ?? ""
    );

    setRecurringNote("");
    setRecurringDay("1");
    setRecurringError("");
  }

  function openAddRecurring() {
    resetRecurringEditor();
    setEditingRecurringId(
      "__new__"
    );
  }

  function openEditRecurring(
    item: FinanceRecurring
  ) {
    setEditingRecurringId(
      item.id
    );

    setRecurringType(item.type);

    setRecurringAccountId(
      item.accountId
    );

    setRecurringAmount(
      String(item.amount)
    );

    setRecurringCategory(
      item.category
    );

    setRecurringNote(
      item.note
    );

    setRecurringDay(
      String(item.dayOfMonth)
    );

    setRecurringError("");
  }

  function closeRecurringEditor() {
    resetRecurringEditor();
  }

  function saveRecurringItem() {
    if (!recurringAccountId) {
      setRecurringError(
        "Pilih account terlebih dahulu."
      );
      return;
    }

    const parsedAmount =
      Number(recurringAmount);

    if (
      !Number.isFinite(
        parsedAmount
      ) ||
      parsedAmount <= 0
    ) {
      setRecurringError(
        "Masukkan nominal yang valid."
      );
      return;
    }

    const parsedDay =
      Number(recurringDay);

    if (
      !Number.isInteger(
        parsedDay
      ) ||
      parsedDay < 1 ||
      parsedDay > 31
    ) {
      setRecurringError(
        "Tanggal harus antara 1 dan 31."
      );
      return;
    }

    if (
      !recurringCategory.trim()
    ) {
      setRecurringError(
        "Pilih category terlebih dahulu."
      );
      return;
    }

    const old =
      editingRecurringId &&
      editingRecurringId !==
        "__new__"
        ? recurring.find(
            (item) =>
              item.id ===
              editingRecurringId
          )
        : undefined;

    const item:
      FinanceRecurring = {
      id:
        old?.id ?? createId(),
      type: recurringType,
      accountId:
        recurringAccountId,
      amount:
        Math.floor(parsedAmount),
      category:
        recurringCategory.trim(),
      note:
        recurringNote.trim(),
      dayOfMonth:
        parsedDay,
      active:
        old?.active ?? true,
      createdAt:
        old?.createdAt ??
        new Date().toISOString(),
      generatedMonths:
        old?.generatedMonths ??
        [],
    };

    saveRecurring(
      old
        ? recurring.map((x) =>
            x.id === old.id
              ? item
              : x
          )
        : [
            item,
            ...recurring,
          ]
    );

    resetRecurringEditor();
  }

  function deleteRecurringItem(
    item: FinanceRecurring
  ) {
    if (
      !window.confirm(
        `Hapus recurring ${item.category}?`
      )
    ) {
      return;
    }

    saveRecurring(
      recurring.filter(
        (x) =>
          x.id !== item.id
      )
    );

    if (
      editingRecurringId ===
      item.id
    ) {
      resetRecurringEditor();
    }
  }

  function toggleRecurring(
    item: FinanceRecurring
  ) {
    saveRecurring(
      recurring.map((x) =>
        x.id === item.id
          ? {
              ...x,
              active:
                !x.active,
            }
          : x
      )
    );
  }

  function generateRecurring(
    item: FinanceRecurring
  ) {
    if (
      !item.active ||
      item.generatedMonths.includes(
        selectedMonth
      )
    ) {
      return;
    }

    const [year, month] =
      selectedMonth
        .split("-")
        .map(Number);

    const lastDay =
      new Date(
        year,
        month,
        0
      ).getDate();

    const actualDay =
      Math.min(
        item.dayOfMonth,
        lastDay
      );

    const generatedTransaction:
      FinanceTransaction = {
      id: createId(),
      type: item.type,
      accountId:
        item.accountId,
      amount:
        item.amount,
      category:
        item.category,
      note: item.note
        ? `${item.note} · Recurring`
        : "Recurring",
      date: `${selectedMonth}-${String(
        actualDay
      ).padStart(2, "0")}`,
      createdAt:
        new Date().toISOString(),
    };

    saveTransactions([
      generatedTransaction,
      ...transactions,
    ]);

    saveRecurring(
      recurring.map((x) =>
        x.id === item.id
          ? {
              ...x,
              generatedMonths: [
                ...x.generatedMonths,
                selectedMonth,
              ],
            }
          : x
      )
    );
  }

  return {
    recurring,

    editingRecurringId,

    recurringType,
    recurringAccountId,
    recurringAmount,
    recurringCategory,
    recurringNote,
    recurringDay,
    recurringError,

    openAddRecurring,
    openEditRecurring,
    closeRecurringEditor,
    saveRecurringItem,
    deleteRecurringItem,
    toggleRecurring,
    generateRecurring,

    setRecurringType,
    setRecurringAccountId,
    setRecurringAmount,
    setRecurringCategory,
    setRecurringNote,
    setRecurringDay,
  };
}