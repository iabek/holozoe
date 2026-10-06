"use client";

type CategoryType =
  | "Income"
  | "Expense";

type FinanceCategory = {
  id: string;
  name: string;
  type: CategoryType;
  createdAt: string;
};

type FinanceCategoriesProps = {
  categories: FinanceCategory[];
  expenseCategories: FinanceCategory[];
  incomeCategories: FinanceCategory[];
  editingCategoryId: string | null;
  categoryName: string;
  categoryType: CategoryType;
  categoryError: string;
  onCategoryNameChange: (value: string) => void;
  onCategoryTypeChange: (value: CategoryType) => void;
  onCancelCategoryEditor: () => void;
  onSaveCategory: () => void;
  onOpenEditCategory: (category: FinanceCategory) => void;
  onDeleteCategory: (category: FinanceCategory) => void;
};

export default function FinanceCategories({
  categories,
  expenseCategories,
  incomeCategories,
  editingCategoryId,
  categoryName,
  categoryType,
  categoryError,
  onCategoryNameChange,
  onCategoryTypeChange,
  onCancelCategoryEditor,
  onSaveCategory,
  onOpenEditCategory,
  onDeleteCategory,
}: FinanceCategoriesProps) {
  return (
<section className="mt-7">
  <div className="flex flex-wrap items-end justify-between gap-3">
    <div>
      <p className="text-xs uppercase tracking-widest opacity-50">
        Categories
      </p>

      <h3 className="mt-1 text-xl font-bold">
        Manage Categories
      </h3>
    </div>

    <span className="text-sm opacity-50">
      {categories.length} saved
    </span>
  </div>

  <div className="mt-4 rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6">
    <div className="grid gap-4 md:grid-cols-[1fr_180px_auto]">
      <div>
        <label
          htmlFor="finance-category-name"
          className="text-sm font-medium"
        >
          Category Name
        </label>

        <input
          id="finance-category-name"
          type="text"
          value={categoryName}
          onChange={(event) =>
            onCategoryNameChange(
              event.target.value
            )
          }
          placeholder="e.g. Coffee"
          className="mt-2 w-full rounded-xl border border-[#d8cec0] bg-white px-4 py-3 text-base outline-none focus:border-[#8f806d]"
        />
      </div>

      <div>
        <label
          htmlFor="finance-category-type"
          className="text-sm font-medium"
        >
          Type
        </label>

        <select
          id="finance-category-type"
          value={
            categoryType
          }
          onChange={(event) =>
            onCategoryTypeChange(
              event.target.value as CategoryType
            )
          }
          className="mt-2 w-full rounded-xl border border-[#d8cec0] bg-white px-4 py-3 text-base outline-none focus:border-[#8f806d]"
        >
          <option value="Expense">
            💸 Expense
          </option>

          <option value="Income">
            💰 Income
          </option>
        </select>
      </div>

      <div className="flex items-end gap-2">
        {editingCategoryId && (
          <button
            type="button"
            onClick={onCancelCategoryEditor}
            className="rounded-xl bg-[#ddd4c7] px-4 py-3 text-sm font-medium transition hover:bg-[#cfc3b4]"
          >
            Cancel
          </button>
        )}

        <button
          type="button"
          onClick={onSaveCategory}
          className="rounded-xl bg-[#8f806d] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#7d6f5e]"
        >
          {editingCategoryId
            ? "Save Changes"
            : "+ Add Category"}
        </button>
      </div>
    </div>

    {categoryError && (
      <p className="mt-4 rounded-xl bg-[#ead7d1] px-4 py-3 text-sm text-[#71463d]">
        {categoryError}
      </p>
    )}

    <div className="mt-6 grid gap-5 md:grid-cols-2">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold">
            💸 Expense
          </p>

          <span className="text-xs opacity-40">
            {
              expenseCategories.length
            }
          </span>
        </div>

        {expenseCategories.length ===
        0 ? (
          <div className="rounded-2xl border border-dashed border-[#d8cec0] p-5 text-center">
            <p className="text-sm opacity-50">
              No expense categories.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {expenseCategories.map(
              (item) => (
                <div
                  key={
                    item.id
                  }
                  className="flex items-center justify-between gap-3 rounded-2xl bg-[#f5f0e8] px-4 py-3"
                >
                  <p className="min-w-0 truncate text-sm font-medium">
                    {item.name}
                  </p>

                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenEditCategory(item)}
                      className="rounded-lg bg-[#ddd4c7] px-3 py-2 text-xs font-medium transition hover:bg-[#cfc3b4]"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteCategory(item)}
                      className="rounded-lg bg-[#ead7d1] px-3 py-2 text-xs font-medium text-[#71463d] transition hover:bg-[#dfc8c1]"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold">
            💰 Income
          </p>

          <span className="text-xs opacity-40">
            {
              incomeCategories.length
            }
          </span>
        </div>

        {incomeCategories.length ===
        0 ? (
          <div className="rounded-2xl border border-dashed border-[#d8cec0] p-5 text-center">
            <p className="text-sm opacity-50">
              No income categories.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {incomeCategories.map(
              (item) => (
                <div
                  key={
                    item.id
                  }
                  className="flex items-center justify-between gap-3 rounded-2xl bg-[#f5f0e8] px-4 py-3"
                >
                  <p className="min-w-0 truncate text-sm font-medium">
                    {item.name}
                  </p>

                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenEditCategory(item)}
                      className="rounded-lg bg-[#ddd4c7] px-3 py-2 text-xs font-medium transition hover:bg-[#cfc3b4]"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteCategory(item)}
                      className="rounded-lg bg-[#ead7d1] px-3 py-2 text-xs font-medium text-[#71463d] transition hover:bg-[#dfc8c1]"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>

    <div className="mt-5 rounded-2xl border border-[#d8cec0] bg-[#f5f0e8]/70 p-4">
      <p className="text-xs uppercase tracking-widest opacity-40">
        Custom categories
      </p>

      <p className="mt-2 text-sm leading-6 opacity-60">
        Category tetap fleksibel. Saat membuat
        transaksi, adek bisa memilih category
        yang sudah tersimpan atau mengetik
        category baru. Category baru otomatis
        disimpan untuk dipakai lagi nanti.
      </p>
    </div>
  </div>
</section>
  );
}
