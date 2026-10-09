import { useEffect, useState } from "react";
import type {
  CategoryType,
  FinanceCategory,
} from "../types";
import {
  CATEGORY_STORAGE_KEY,
  createId,
} from "../utils";
import { saveCurrentLifeGameStorage } from "@/lib/life-game-storage";

const defaultCategories: FinanceCategory[] = [
  [
    "default-expense-food",
    "Food",
    "Expense",
  ],
  [
    "default-expense-transport",
    "Transport",
    "Expense",
  ],
  [
    "default-expense-living",
    "Living",
    "Expense",
  ],
  [
    "default-expense-shopping",
    "Shopping",
    "Expense",
  ],
  [
    "default-expense-education",
    "Education",
    "Expense",
  ],
  [
    "default-expense-entertainment",
    "Entertainment",
    "Expense",
  ],
  [
    "default-expense-health",
    "Health",
    "Expense",
  ],
  [
    "default-expense-bills",
    "Bills",
    "Expense",
  ],
  [
    "default-expense-other",
    "Other",
    "Expense",
  ],
  [
    "default-income-salary",
    "Salary",
    "Income",
  ],
  [
    "default-income-freelance",
    "Freelance",
    "Income",
  ],
  [
    "default-income-allowance",
    "Allowance",
    "Income",
  ],
  [
    "default-income-gift",
    "Gift",
    "Income",
  ],
  [
    "default-income-refund",
    "Refund",
    "Income",
  ],
  [
    "default-income-other",
    "Other",
    "Income",
  ],
].map(([id, name, type]) => ({
  id,
  name,
  type: type as CategoryType,
  createdAt:
    "2026-01-01T00:00:00.000Z",
}));

export default function useFinanceCategories() {
  const [categories, setCategories] =
    useState<FinanceCategory[]>([]);

  useEffect(() => {
    const saved =
      localStorage.getItem(
        CATEGORY_STORAGE_KEY
      );

    if (!saved) {
      setCategories(
        defaultCategories
      );

      localStorage.setItem(
        CATEGORY_STORAGE_KEY,
        JSON.stringify(
          defaultCategories
        )
      );

      return;
    }

    try {
      const parsed = JSON.parse(saved);

      if (Array.isArray(parsed)) {
        setCategories(
          parsed.filter(
            (item) =>
              item &&
              typeof item.id ===
                "string" &&
              typeof item.name ===
                "string" &&
              (
                item.type ===
                  "Income" ||
                item.type ===
                  "Expense"
              )
          )
        );
      } else {
        setCategories(
          defaultCategories
        );
      }
    } catch {
      setCategories(
        defaultCategories
      );
    }
  }, []);

  const [
    editingCategoryId,
    setEditingCategoryId,
  ] = useState<string | null>(
    null
  );

  const [categoryName, setCategoryName] =
    useState("");

  const [categoryType, setCategoryType] =
    useState<CategoryType>(
      "Expense"
    );

  const [categoryError, setCategoryError] =
    useState("");

  function notifyUpdate() {
    window.dispatchEvent(
      new Event("life-game-updated")
    );
  }

  async function saveCategories(
    updated: FinanceCategory[]
  ) {
    setCategories(updated);

    localStorage.setItem(
      CATEGORY_STORAGE_KEY,
      JSON.stringify(updated)
    );

    notifyUpdate();

    const result =
      await saveCurrentLifeGameStorage(
        CATEGORY_STORAGE_KEY
      );

    if (!result.success) {
      console.error(
        "Gagal menyimpan finance categories ke Supabase:",
        result
      );
    }
  }

  function openEditCategory(
    item: FinanceCategory
  ) {
    setEditingCategoryId(item.id);
    setCategoryName(item.name);
    setCategoryType(item.type);
    setCategoryError("");
  }

  function cancelCategoryEditor() {
    setEditingCategoryId(null);
    setCategoryName("");
    setCategoryType("Expense");
    setCategoryError("");
  }

  function saveCategory() {
    const cleanName =
      categoryName.trim();

    if (!cleanName) {
      setCategoryError(
        "Nama category wajib diisi."
      );
      return;
    }

    const duplicate =
      categories.some(
        (item) =>
          item.id !==
            editingCategoryId &&
          item.type ===
            categoryType &&
          item.name
            .trim()
            .toLowerCase() ===
            cleanName.toLowerCase()
      );

    if (duplicate) {
      setCategoryError(
        "Category tersebut sudah ada."
      );
      return;
    }

    if (editingCategoryId) {
      saveCategories(
        categories.map((item) =>
          item.id ===
          editingCategoryId
            ? {
                ...item,
                name: cleanName,
                type: categoryType,
              }
            : item
        )
      );

      cancelCategoryEditor();
      return;
    }

    saveCategories([
      ...categories,
      {
        id: createId(),
        name: cleanName,
        type: categoryType,
        createdAt:
          new Date().toISOString(),
      },
    ]);

    setCategoryName("");
    setCategoryError("");
  }

  function deleteCategory(
    item: FinanceCategory
  ) {
    if (
      !window.confirm(
        `Hapus category "${item.name}"?\n\nTransaksi lama yang menggunakan category ini tidak akan ikut terhapus.`
      )
    ) {
      return;
    }

    saveCategories(
      categories.filter(
        (category) =>
          category.id !== item.id
      )
    );

    if (
      editingCategoryId === item.id
    ) {
      cancelCategoryEditor();
    }
  }

  const expenseCategories =
    categories
      .filter(
        (item) =>
          item.type === "Expense"
      )
      .sort((a, b) =>
        a.name.localeCompare(
          b.name
        )
      );

  const incomeCategories =
    categories
      .filter(
        (item) =>
          item.type === "Income"
      )
      .sort((a, b) =>
        a.name.localeCompare(
          b.name
        )
      );

  return {
    categories,
    expenseCategories,
    incomeCategories,
    saveCategories,
    editingCategoryId,
    categoryName,
    categoryType,
    categoryError,
    openEditCategory,
    cancelCategoryEditor,
    saveCategory,
    deleteCategory,
    setCategoryName,
    setCategoryType,
  };
}
