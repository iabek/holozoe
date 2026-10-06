import { useEffect, useMemo, useState } from "react";
import type {
  FinanceAccount,
  FinanceCategory,
  FinanceTransaction,
  TransactionType,
} from "../types";
import {
  TRANSACTION_STORAGE_KEY,
  createId,
  getToday,
} from "../utils";
import { saveCurrentLifeGameStorage } from "@/lib/life-game-storage";

type UseFinanceTransactionsProps = {
  accounts: FinanceAccount[];
  categories: FinanceCategory[];
  onSaveCategories: (
    categories: FinanceCategory[]
  ) => void;
};

export default function useFinanceTransactions({
  accounts,
  categories,
  onSaveCategories,
}: UseFinanceTransactionsProps) {
  const [transactions, setTransactions] =
    useState<FinanceTransaction[]>([]);

  const [
    isTransactionEditorOpen,
    setIsTransactionEditorOpen,
  ] = useState(false);

  const [transactionType, setTransactionType] =
    useState<TransactionType>("Expense");

  const [transactionAccountId, setTransactionAccountId] =
    useState("");

  const [fromAccountId, setFromAccountId] =
    useState("");

  const [toAccountId, setToAccountId] =
    useState("");

  const [amount, setAmount] =
    useState("");

  const [category, setCategory] =
    useState("");

  const [note, setNote] =
    useState("");

  const [date, setDate] =
    useState(getToday());

  const [error, setError] =
    useState("");

  useEffect(() => {
    const savedTransactions =
      localStorage.getItem(
        TRANSACTION_STORAGE_KEY
      );

    if (!savedTransactions) return;

    try {
      const parsed =
        JSON.parse(savedTransactions);

      if (Array.isArray(parsed)) {
        setTransactions(
          parsed.filter(
            (transaction) =>
              transaction &&
              typeof transaction === "object" &&
              typeof transaction.id === "string" &&
              typeof transaction.type === "string" &&
              typeof transaction.amount === "number"
          )
        );
      }
    } catch {
      setTransactions([]);
    }
  }, []);

  function notifyUpdate() {
    window.dispatchEvent(
      new Event("life-game-updated")
    );
  }

  async function saveTransactions(
    updatedTransactions: FinanceTransaction[]
  ) {
    setTransactions(updatedTransactions);

    localStorage.setItem(
      TRANSACTION_STORAGE_KEY,
      JSON.stringify(updatedTransactions)
    );

    notifyUpdate();

    const result =
      await saveCurrentLifeGameStorage(
        TRANSACTION_STORAGE_KEY
      );

    if (!result.success) {
      console.error(
        "Gagal menyimpan finance transactions ke Supabase:",
        result
      );
    }
  }

  function openAddTransaction() {
    const firstAccount =
      accounts[0]?.id ?? "";

    setTransactionType("Expense");

    setTransactionAccountId(
      firstAccount
    );

    setFromAccountId(
      firstAccount
    );

    setToAccountId(
      accounts[1]?.id ?? ""
    );

    setAmount("");
    setCategory("");
    setNote("");
    setDate(getToday());
    setError("");

    setIsTransactionEditorOpen(true);
  }

  function closeTransactionEditor() {
    setIsTransactionEditorOpen(false);

    setTransactionType("Expense");

    setTransactionAccountId("");

    setFromAccountId("");

    setToAccountId("");

    setAmount("");

    setCategory("");

    setNote("");

    setDate(getToday());

    setError("");
  }

  function saveTransaction() {
    if (accounts.length === 0) {
      setError(
        "Buat account terlebih dahulu."
      );
      return;
    }

    const parsedAmount =
      Number(amount);

    if (
      amount.trim() === "" ||
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0
    ) {
      setError(
        "Masukkan nominal yang valid."
      );
      return;
    }

    if (!date) {
      setError(
        "Tanggal transaksi wajib diisi."
      );
      return;
    }

    if (
      (
        transactionType === "Income" ||
        transactionType === "Expense"
      ) &&
      !transactionAccountId
    ) {
      setError(
        "Pilih account terlebih dahulu."
      );
      return;
    }

    if (
      transactionType === "Transfer"
    ) {
      if (!fromAccountId) {
        setError(
          "Pilih account asal."
        );
        return;
      }

      if (!toAccountId) {
        setError(
          "Pilih account tujuan."
        );
        return;
      }

      if (
        fromAccountId ===
        toAccountId
      ) {
        setError(
          "Account asal dan tujuan harus berbeda."
        );
        return;
      }
    }

    const cleanAmount =
      Math.floor(parsedAmount);

    const cleanCategory =
      category.trim();

    if (
      (
        transactionType === "Income" ||
        transactionType === "Expense"
      ) &&
      cleanCategory
    ) {
      const exists =
        categories.some(
          (item) =>
            item.type ===
              transactionType &&
            item.name
              .trim()
              .toLowerCase() ===
              cleanCategory.toLowerCase()
        );

      if (!exists) {
        onSaveCategories([
          ...categories,
          {
            id: createId(),
            name: cleanCategory,
            type: transactionType,
            createdAt:
              new Date().toISOString(),
          },
        ]);
      }
    }

    const newTransaction:
      FinanceTransaction = {
      id: createId(),
      type: transactionType,
      amount: cleanAmount,
      category: cleanCategory,
      note: note.trim(),
      date,
      createdAt:
        new Date().toISOString(),
    };

    if (
      transactionType === "Income" ||
      transactionType === "Expense"
    ) {
      newTransaction.accountId =
        transactionAccountId;
    }

    if (
      transactionType === "Transfer"
    ) {
      newTransaction.fromAccountId =
        fromAccountId;

      newTransaction.toAccountId =
        toAccountId;
    }

    saveTransactions([
      newTransaction,
      ...transactions,
    ]);

    closeTransactionEditor();
  }

  function deleteTransaction(
    transaction: FinanceTransaction
  ) {
    if (
      !window.confirm(
        "Hapus transaksi ini?\n\nSaldo account akan otomatis kembali seperti sebelum transaksi."
      )
    ) {
      return;
    }

    saveTransactions(
      transactions.filter(
        (item) =>
          item.id !== transaction.id
      )
    );
  }

  function getAccountName(
    accountId?: string
  ) {
    if (!accountId) {
      return "Unknown account";
    }

    return (
      accounts.find(
        (account) =>
          account.id === accountId
      )?.name ??
      "Unknown account"
    );
  }

  const expenseCategories =
    useMemo(
      () =>
        categories
          .filter(
            (item) =>
              item.type ===
              "Expense"
          )
          .sort((a, b) =>
            a.name.localeCompare(
              b.name
            )
          ),
      [categories]
    );

  const incomeCategories =
    useMemo(
      () =>
        categories
          .filter(
            (item) =>
              item.type ===
              "Income"
          )
          .sort((a, b) =>
            a.name.localeCompare(
              b.name
            )
          ),
      [categories]
    );

  const recentTransactions =
    useMemo(
      () =>
        [...transactions]
          .sort(
            (a, b) =>
              b.date.localeCompare(
                a.date
              ) ||
              b.createdAt.localeCompare(
                a.createdAt
              )
          )
          .slice(0, 20),
      [transactions]
    );

  const currentCategorySuggestions =
    transactionType ===
    "Income"
      ? incomeCategories
      : transactionType ===
        "Expense"
      ? expenseCategories
      : [];

  return {
    transactions,
    setTransactions,
    saveTransactions,

    isTransactionEditorOpen,
    transactionType,
    transactionAccountId,
    fromAccountId,
    toAccountId,
    amount,
    category,
    note,
    date,
    error,

    expenseCategories,
    incomeCategories,
    recentTransactions,
    currentCategorySuggestions,

    openAddTransaction,
    closeTransactionEditor,
    saveTransaction,
    deleteTransaction,
    getAccountName,

    setTransactionType,
    setTransactionAccountId,
    setFromAccountId,
    setToAccountId,
    setAmount,
    setCategory,
    setNote,
    setDate,
    setError,
  };
}