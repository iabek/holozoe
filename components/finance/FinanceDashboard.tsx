"use client";

import { useEffect, useMemo, useState } from "react";

type MonthlyCategory = {
  name: string;
  amount: number;
  percentage: number;
};

type FinanceAccount = {
  id: string;
  name: string;
  type: string;
  icon: string;
  balance: number;
};

type FinanceDashboardProps = {
  selectedMonth: string;
  onMonthChange: (month: string) => void;

  totalBalance: number;
  accountCount: number;

  monthlyIncome: number;
  monthlyExpense: number;
  monthlyNet: number;
  monthlyTransactionCount: number;

  monthlyExpenseByCategory: MonthlyCategory[];
  monthlyIncomeByCategory: MonthlyCategory[];

  largestExpenseCategory?: string;
  largestExpenseAmount: number;

  accounts: FinanceAccount[];

  totalIncome: number;
  totalExpense: number;
  totalTransactions: number;

  formatRupiah: (amount: number) => string;
  formatMonth: (month: string) => string;
};

export default function FinanceDashboard({
  selectedMonth,
  onMonthChange,
  totalBalance,
  accountCount,
  monthlyIncome,
  monthlyExpense,
  monthlyNet,
  monthlyTransactionCount,
  monthlyExpenseByCategory,
  monthlyIncomeByCategory,
  largestExpenseCategory,
  largestExpenseAmount,
  accounts,
  totalIncome,
  totalExpense,
  totalTransactions,
  formatRupiah,
  formatMonth,
}: FinanceDashboardProps) {
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(
    () => accounts.map((account) => account.id),
  );

  useEffect(() => {
    setSelectedAccountIds((current) => {
      const availableIds = new Set(accounts.map((account) => account.id));
      const currentAvailable = current.filter((id) => availableIds.has(id));
      const currentIds = new Set(currentAvailable);

      const newAccountIds = accounts
        .map((account) => account.id)
        .filter((id) => !currentIds.has(id));

      return [...currentAvailable, ...newAccountIds];
    });
  }, [accounts]);

  const selectedAccountSet = useMemo(
    () => new Set(selectedAccountIds),
    [selectedAccountIds],
  );

  const filteredTotalBalance = useMemo(
    () =>
      accounts
        .filter((account) => selectedAccountSet.has(account.id))
        .reduce((sum, account) => sum + account.balance, 0),
    [accounts, selectedAccountSet],
  );

  const allAccountsSelected =
    accounts.length > 0 && selectedAccountIds.length === accounts.length;

  const selectedAccountLabel =
    allAccountsSelected
      ? "Semua Akun"
      : selectedAccountIds.length === 0
        ? "0 akun dipilih"
        : `${selectedAccountIds.length} akun dipilih`;

  function toggleAccount(accountId: string) {
    setSelectedAccountIds((current) =>
      current.includes(accountId)
        ? current.filter((id) => id !== accountId)
        : [...current, accountId],
    );
  }

  function toggleAllAccounts() {
    setSelectedAccountIds((current) =>
      accounts.length > 0 && current.length === accounts.length
        ? []
        : accounts.map((account) => account.id),
    );
  }

  return (
    <>
      {/* TOTAL BALANCE */}
      <section className="mt-5 rounded-3xl bg-white/60 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-50">
              Total Balance
            </p>

            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
              {formatRupiah(filteredTotalBalance)}
            </h2>

            <p className="mt-2 text-sm opacity-50">
              Combined balance from selected accounts.
            </p>
          </div>

          <div className="flex flex-col items-end gap-3">
            <details className="relative">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-2xl bg-[#f5f0e8] px-4 py-3 text-left text-sm font-medium outline-none transition hover:bg-[#eee7dc]">
                <span>{selectedAccountLabel}</span>
                <span className="text-xs opacity-50">⌄</span>
              </summary>

              <div className="absolute right-0 z-20 mt-2 w-64 rounded-2xl border border-[#d8cec0] bg-white p-3 shadow-lg">
                <p className="px-2 pb-2 text-xs uppercase tracking-widest opacity-40">
                  Filter Accounts
                </p>

                <label className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-sm hover:bg-[#f5f0e8]">
                  <input
                    type="checkbox"
                    checked={allAccountsSelected}
                    onChange={toggleAllAccounts}
                    className="h-4 w-4 accent-[#8f806d]"
                  />
                  <span className="font-medium">Semua Akun</span>
                </label>

                <div className="my-2 border-t border-[#e4ddd3]" />

                <div className="max-h-56 space-y-1 overflow-y-auto">
                  {accounts.length === 0 ? (
                    <p className="px-2 py-3 text-sm opacity-50">
                      Belum ada account.
                    </p>
                  ) : (
                    accounts.map((account) => (
                      <label
                        key={account.id}
                        className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 hover:bg-[#f5f0e8]"
                      >
                        <input
                          type="checkbox"
                          checked={selectedAccountSet.has(account.id)}
                          onChange={() => toggleAccount(account.id)}
                          className="h-4 w-4 accent-[#8f806d]"
                        />

                        <span className="flex min-w-0 items-center gap-2">
                          <span className="text-base">{account.icon}</span>
                          <span className="truncate text-sm">
                            {account.name}
                          </span>
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </details>

            <div className="rounded-2xl bg-[#f5f0e8] px-4 py-3 text-right">
              <p className="text-xs opacity-50">
                Accounts
              </p>

              <p className="mt-1 text-xl font-bold">
                {selectedAccountIds.length} / {accountCount}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* MONTHLY REPORTING */}
      <section className="mt-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-50">
              Dashboard
            </p>

            <h3 className="mt-1 text-xl font-bold">
              Monthly Overview
            </h3>
          </div>

          <div>
            <label
              htmlFor="finance-report-month"
              className="text-xs font-medium opacity-50"
            >
              Period
            </label>

            <input
              id="finance-report-month"
              type="month"
              value={selectedMonth}
              onChange={(event) =>
                onMonthChange(event.target.value)
              }
              className="mt-1 rounded-xl border border-[#d8cec0] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#8f806d]"
            />
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">
              {formatMonth(selectedMonth)}
            </p>

            <p className="text-xs opacity-40">
              Based on recorded transactions
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl bg-white/60 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-widest opacity-50">
                Income
              </p>

              <p className="mt-2 text-2xl font-bold text-[#5f8068]">
                {formatRupiah(monthlyIncome)}
              </p>

              <p className="mt-1 text-xs opacity-40">
                Money received this month.
              </p>
            </div>

            <div className="rounded-3xl bg-white/60 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-widest opacity-50">
                Expense
              </p>

              <p className="mt-2 text-2xl font-bold text-[#9a5e54]">
                {formatRupiah(monthlyExpense)}
              </p>

              <p className="mt-1 text-xs opacity-40">
                Money spent this month.
              </p>
            </div>

            <div className="rounded-3xl bg-white/60 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-widest opacity-50">
                Net Cash Flow
              </p>

              <p
                className={`mt-2 text-2xl font-bold ${
                  monthlyNet >= 0
                    ? "text-[#5f8068]"
                    : "text-[#9a5e54]"
                }`}
              >
                {monthlyNet >= 0 ? "+" : ""}
                {formatRupiah(monthlyNet)}
              </p>

              <p className="mt-1 text-xs opacity-40">
                Income minus expense.
              </p>
            </div>

            <div className="rounded-3xl bg-white/60 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-widest opacity-50">
                Transactions
              </p>

              <p className="mt-2 text-2xl font-bold">
                {monthlyTransactionCount}
              </p>

              <p className="mt-1 text-xs opacity-40">
                Includes income, expense, and transfer.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {/* EXPENSE BY CATEGORY */}
          <div className="rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest opacity-50">
                  Spending
                </p>

                <h4 className="mt-1 text-lg font-bold">
                  Expense by Category
                </h4>
              </div>

              <p className="text-xs opacity-40">
                {formatMonth(selectedMonth)}
              </p>
            </div>

            {monthlyExpenseByCategory.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-[#d8cec0] p-6 text-center">
                <p className="text-sm opacity-50">
                  Belum ada expense di bulan ini.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {monthlyExpenseByCategory.map((item) => (
                  <div key={item.name}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-medium">
                        {item.name}
                      </p>

                      <p className="shrink-0 text-sm font-semibold">
                        {formatRupiah(item.amount)}
                      </p>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#ddd4c7]">
                      <div
                        className="h-full rounded-full bg-[#9a5e54] transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            item.percentage
                          )}%`,
                        }}
                      />
                    </div>

                    <p className="mt-1 text-[11px] opacity-40">
                      {item.percentage.toFixed(0)}% of monthly expense
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* MONTHLY INCOME */}
          <div className="rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6">
            <div>
              <p className="text-xs uppercase tracking-widest opacity-50">
                Income
              </p>

              <h4 className="mt-1 text-lg font-bold">
                Income by Category
              </h4>
            </div>

            {monthlyIncomeByCategory.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-[#d8cec0] p-6 text-center">
                <p className="text-sm opacity-50">
                  Belum ada income di bulan ini.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {monthlyIncomeByCategory.map((item) => (
                  <div
                    key={item.name}
                    className="rounded-2xl bg-[#f5f0e8] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-medium">
                        {item.name}
                      </p>

                      <p className="shrink-0 text-sm font-semibold text-[#5f8068]">
                        +{formatRupiah(item.amount)}
                      </p>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#ddd4c7]">
                      <div
                        className="h-full rounded-full bg-[#5f8068]"
                        style={{
                          width: `${Math.min(
                            100,
                            item.percentage
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {largestExpenseCategory && (
              <div className="mt-5 rounded-2xl border border-[#d8cec0] bg-[#f5f0e8]/70 p-4">
                <p className="text-xs uppercase tracking-widest opacity-40">
                  Highest spending category
                </p>

                <p className="mt-2 font-semibold">
                  {largestExpenseCategory}
                </p>

                <p className="mt-1 text-sm opacity-60">
                  {formatRupiah(largestExpenseAmount)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ACCOUNT OVERVIEW */}
        <div className="mt-4 rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-50">
              Accounts
            </p>

            <h4 className="mt-1 text-lg font-bold">
              Current Balance by Account
            </h4>
          </div>

          {accounts.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-[#d8cec0] p-6 text-center">
              <p className="text-sm opacity-50">
                Belum ada account.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="rounded-2xl bg-[#f5f0e8] p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/70">
                      {account.icon}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {account.name}
                      </p>

                      <p className="text-xs opacity-40">
                        {account.type}
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 text-lg font-bold">
                    {formatRupiah(account.balance)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ALL TIME OVERVIEW */}
      <section className="mt-6">
        <div>
          <p className="text-xs uppercase tracking-widest opacity-50">
            Lifetime
          </p>

          <h3 className="mt-1 text-xl font-bold">
            All Time Overview
          </h3>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-white/60 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-widest opacity-50">
              Total Income
            </p>

            <p className="mt-2 text-2xl font-bold">
              {formatRupiah(totalIncome)}
            </p>

            <p className="mt-1 text-xs opacity-40">
              Money recorded as incoming.
            </p>
          </div>

          <div className="rounded-3xl bg-white/60 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-widest opacity-50">
              Total Expense
            </p>

            <p className="mt-2 text-2xl font-bold">
              {formatRupiah(totalExpense)}
            </p>

            <p className="mt-1 text-xs opacity-40">
              Money recorded as outgoing.
            </p>
          </div>

          <div className="rounded-3xl bg-white/60 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-widest opacity-50">
              Transactions
            </p>

            <p className="mt-2 text-2xl font-bold">
              {totalTransactions}
            </p>

            <p className="mt-1 text-xs opacity-40">
              Transfer does not change total balance.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}