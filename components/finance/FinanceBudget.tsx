 "use client";

type FinanceBudget = {
  id: string;
  month: string;
  category: string;
  amount: number;
  createdAt: string;
};

type FinanceCategory = {
  id: string;
  name: string;
  type: "Income" | "Expense";
  createdAt: string;
};

type BudgetRow = FinanceBudget & {
  spent: number;
  remaining: number;
  usage: number;
};

type FinanceBudgetProps = {
  selectedMonth: string;
  onMonthChange: (value: string) => void;
  budgets: FinanceBudget[];
  budgetRows: BudgetRow[];
  expenseCategories: FinanceCategory[];
  editingBudgetId: string | null;
  budgetMonth: string;
  budgetCategory: string;
  budgetAmount: string;
  budgetError: string;
  onBudgetMonthChange: (value: string) => void;
  onBudgetCategoryChange: (value: string) => void;
  onBudgetAmountChange: (value: string) => void;
  onOpenAddBudget: () => void;
  onOpenEditBudget: (budget: FinanceBudget) => void;
  onCancelBudgetEditor: () => void;
  onSaveBudget: () => void;
  onDeleteBudget: (budget: FinanceBudget) => void;
  formatRupiah: (amount: number) => string;
  formatMonth: (month: string) => string;
};

export default function FinanceBudget({
  selectedMonth,
  onMonthChange,
  budgets,
  budgetRows,
  expenseCategories,
  editingBudgetId,
  budgetMonth,
  budgetCategory,
  budgetAmount,
  budgetError,
  onBudgetMonthChange,
  onBudgetCategoryChange,
  onBudgetAmountChange,
  onOpenAddBudget,
  onOpenEditBudget,
  onCancelBudgetEditor,
  onSaveBudget,
  onDeleteBudget,
  formatRupiah,
  formatMonth,
}: FinanceBudgetProps) {
  const monthRows = budgetRows.filter(
    (budget) => budget.month === selectedMonth
  );

  const totalBudget = monthRows.reduce(
    (total, budget) => total + budget.amount,
    0
  );

  const totalSpent = monthRows.reduce(
    (total, budget) => total + budget.spent,
    0
  );

  const totalRemaining = totalBudget - totalSpent;

  function getStatus(usage: number) {
    if (usage >= 100) {
      return {
        label: "Over budget",
        className: "bg-[#ead1c9] text-[#8b4f43]",
      };
    }

    if (usage >= 80) {
      return {
        label: "Warning",
        className: "bg-[#eadfca] text-[#8a6a35]",
      };
    }

    return {
      label: "On track",
      className: "bg-[#d9e3d8] text-[#587052]",
    };
  }

  return (
    <section className="mt-6 rounded-3xl border border-[#d8cec0] bg-[#f8f4ed] p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest opacity-40">
            Spending control
          </p>
          <h4 className="mt-1 text-lg font-bold">Budget</h4>
          <p className="mt-1 text-sm opacity-55">
            Atur batas pengeluaran per category untuk bulan tertentu.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs opacity-50">Month</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(event) => onMonthChange(event.target.value)}
            className="rounded-xl border border-[#d8cec0] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#9a8b78]"
          />
          <button
            type="button"
            onClick={onOpenAddBudget}
            className="rounded-xl bg-[#8f806d] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#7d6f5e]"
          >
            + Add Budget
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-4">
          <p className="text-xs opacity-45">Total Budget</p>
          <p className="mt-1 text-lg font-bold">{formatRupiah(totalBudget)}</p>
        </div>

        <div className="rounded-2xl bg-white p-4">
          <p className="text-xs opacity-45">Spent Against Budget</p>
          <p className="mt-1 text-lg font-bold">{formatRupiah(totalSpent)}</p>
        </div>

        <div className="rounded-2xl bg-white p-4">
          <p className="text-xs opacity-45">Remaining</p>
          <p
            className={`mt-1 text-lg font-bold ${
              totalRemaining < 0 ? "text-[#9a574b]" : "text-[#587052]"
            }`}
          >
            {formatRupiah(totalRemaining)}
          </p>
        </div>
      </div>

      {editingBudgetId && (
        <div className="mt-5 rounded-2xl border border-[#d8cec0] bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">
                {editingBudgetId === "__new__" ? "Add Budget" : "Edit Budget"}
              </p>
              <p className="text-xs opacity-50">{formatMonth(budgetMonth)}</p>
            </div>

            <button
              type="button"
              onClick={onCancelBudgetEditor}
              className="rounded-lg px-3 py-2 text-xs opacity-60 transition hover:bg-[#f0ebe3]"
            >
              Cancel
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <label className="text-sm">
              <span className="mb-1 block text-xs opacity-50">Month</span>
              <input
                type="month"
                value={budgetMonth}
                onChange={(event) => onBudgetMonthChange(event.target.value)}
                className="w-full rounded-xl border border-[#d8cec0] bg-[#faf8f4] px-3 py-2.5 outline-none focus:border-[#9a8b78]"
              />
            </label>

            <label className="text-sm">
              <span className="mb-1 block text-xs opacity-50">Category</span>
              <select
                value={budgetCategory}
                onChange={(event) => onBudgetCategoryChange(event.target.value)}
                className="w-full rounded-xl border border-[#d8cec0] bg-[#faf8f4] px-3 py-2.5 outline-none focus:border-[#9a8b78]"
              >
                <option value="">Select category</option>
                {expenseCategories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <span className="mb-1 block text-xs opacity-50">Amount</span>
              <input
                type="number"
                min="0"
                step="1000"
                value={budgetAmount}
                onChange={(event) => onBudgetAmountChange(event.target.value)}
                placeholder="500000"
                className="w-full rounded-xl border border-[#d8cec0] bg-[#faf8f4] px-3 py-2.5 outline-none focus:border-[#9a8b78]"
              />
            </label>
          </div>

          {budgetError && (
            <p className="mt-3 text-sm text-[#9a574b]">{budgetError}</p>
          )}

          <button
            type="button"
            onClick={onSaveBudget}
            className="mt-4 rounded-xl bg-[#8f806d] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#7d6f5e]"
          >
            {editingBudgetId === "__new__" ? "Add Budget" : "Save Budget"}
          </button>
        </div>
      )}

      {!editingBudgetId && budgetError && (
        <p className="mt-4 text-sm text-[#9a574b]">{budgetError}</p>
      )}

      <div className="mt-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">{formatMonth(selectedMonth)}</p>
            <p className="text-xs opacity-45">
              {monthRows.length} category budget
              {monthRows.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {monthRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d8cec0] bg-white p-6 text-center">
            <p className="text-sm font-medium">Belum ada budget bulan ini.</p>
            <p className="mt-1 text-xs opacity-50">
              Tambahkan budget seperti Food → Rp500.000 untuk mulai memantau
              pengeluaran.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {monthRows.map((budget) => {
              const status = getStatus(budget.usage);
              const progress = Math.min(100, Math.max(0, budget.usage));

              return (
                <div
                  key={budget.id}
                  className="rounded-2xl border border-[#ded5c9] bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{budget.category}</p>
                        <span
                          className={`rounded-full px-2 py-1 text-[11px] font-medium ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </div>
                      <p className="mt-1 text-xs opacity-45">
                        Budget {formatRupiah(budget.amount)} · Spent{" "}
                        {formatRupiah(budget.spent)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenEditBudget(budget)}
                        className="rounded-lg px-3 py-2 text-xs opacity-60 transition hover:bg-[#f0ebe3]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteBudget(budget)}
                        className="rounded-lg px-3 py-2 text-xs text-[#9a574b] opacity-70 transition hover:bg-[#f5e8e3]"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#eee8df]">
                    <div
                      className={`h-full rounded-full ${
                        budget.usage >= 100
                          ? "bg-[#b66b5d]"
                          : budget.usage >= 80
                          ? "bg-[#c7a25e]"
                          : "bg-[#7c9274]"
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs opacity-55">
                    <span>{budget.usage.toFixed(0)}% used</span>
                    <span>Remaining {formatRupiah(budget.remaining)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-5 rounded-2xl bg-[#eee8df]/70 p-4">
        <p className="text-xs uppercase tracking-widest opacity-40">
          Budget rules
        </p>
        <p className="mt-2 text-xs leading-5 opacity-55">
          Hanya transaksi Expense yang masuk perhitungan. Income dan Transfer
          tidak mengurangi budget. Budget hanya memberi batas dan peringatan;
          transaksi tetap bisa dicatat walaupun melewati limit.
        </p>
      </div>

      {budgets.length > 0 && (
        <p className="mt-4 text-[11px] opacity-35">
          {budgets.length} budget tersimpan di seluruh bulan.
        </p>
      )}
    </section>
  );
}
