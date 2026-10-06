"use client";

import FinanceDashboard from "@/components/finance/FinanceDashboard";
import FinanceAccounts from "@/components/finance/FinanceAccounts";
import FinanceCategories from "@/components/finance/FinanceCategories";
import FinanceBudget from "@/components/finance/FinanceBudget";
import FinanceRecurring from "@/components/finance/FinanceRecurring";
import FinanceGoals from "@/components/finance/FinanceGoals";
import FinanceTransactions from "@/components/finance/FinanceTransactions";

import useFinanceAccounts from "@/components/finance/hooks/useFinanceAccounts";
import useFinanceTransactions from "@/components/finance/hooks/useFinanceTransactions";
import useFinanceCategories from "@/components/finance/hooks/useFinanceCategories";
import useFinanceBudget from "@/components/finance/hooks/useFinanceBudget";
import useFinanceRecurring from "@/components/finance/hooks/useFinanceRecurring";
import useFinanceGoals from "@/components/finance/hooks/useFinanceGoals";
import useFinanceReports from "@/components/finance/hooks/useFinanceReports";

import type { FinanceAccount } from "@/components/finance/types";
import {
  formatDate,
  formatMonth,
  formatRupiah,
  getAccountTypeInfo,
  getCurrentMonth,
  getTransactionTypeInfo,
  transactionTypes,
} from "@/components/finance/utils";
import { useState } from "react";

export default function Finance() {
  const [selectedMonth, setSelectedMonth] =
    useState(getCurrentMonth());

  const categoryFinance = useFinanceCategories();

  const accountFinance = useFinanceAccounts();

  const transactionFinance = useFinanceTransactions({
    accounts: accountFinance.accounts,
    categories: categoryFinance.categories,
    onSaveCategories: categoryFinance.saveCategories,
  });

  const budgetFinance = useFinanceBudget({
    transactions: transactionFinance.transactions,
    expenseCategories:
      categoryFinance.expenseCategories,
    selectedMonth,
  });

  const recurringFinance = useFinanceRecurring({
    accounts: accountFinance.accounts,
    expenseCategories:
      categoryFinance.expenseCategories,
    incomeCategories:
      categoryFinance.incomeCategories,
    selectedMonth,
    transactions:
      transactionFinance.transactions,
    saveTransactions:
      transactionFinance.saveTransactions,
  });

  const goalFinance = useFinanceGoals({
    accounts: accountFinance.accounts,
  });

  const reports = useFinanceReports({
    accounts: accountFinance.accounts,
    transactions:
      transactionFinance.transactions,
    goalTransactions:
      goalFinance.goalTransactions,
    selectedMonth,
  });

  const {
    accountBalances,
    totalBalance,
    totalIncome,
    totalExpense,
    monthlyTransactions,
    monthlyIncome,
    monthlyExpense,
    monthlyNet,
    monthlyExpenseByCategoryData,
    monthlyIncomeByCategoryData,
    largestExpenseCategory,
    largestExpenseAmount,
  } = reports;

  const {
    accounts,
    isAccountEditorOpen,
    editingAccountId,
    accountName,
    accountType,
    initialBalance,
    error: accountError,
    groupedAccounts,
    openAddAccount,
    openEditAccount,
    closeAccountEditor,
    saveAccount,
    setAccountName,
    setAccountType,
    setInitialBalance,
  } = accountFinance;

  const {
    transactions,
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
    currentCategorySuggestions,
    recentTransactions,
    getAccountName,
    openAddTransaction,
    closeTransactionEditor,
    saveTransaction,
    deleteTransaction,
    setTransactionType,
    setTransactionAccountId,
    setFromAccountId,
    setToAccountId,
    setAmount,
    setCategory,
    setNote,
    setDate,
    setError: setTransactionError,
  } = transactionFinance;

  function deleteAccount(
    account: FinanceAccount
  ) {
    const hasTransactions =
      transactions.some(
        (transaction) =>
          transaction.accountId ===
            account.id ||
          transaction.fromAccountId ===
            account.id ||
          transaction.toAccountId ===
            account.id
      );

    const hasGoalTransactions =
      goalFinance.goalTransactions.some(
        (transaction) =>
          transaction.accountId ===
          account.id
      );

    if (
      hasTransactions ||
      hasGoalTransactions
    ) {
      window.alert(
        "Account ini tidak bisa dihapus karena sudah memiliki transaksi. Hapus transaksi terkait terlebih dahulu."
      );
      return;
    }

    accountFinance.deleteAccount(
      account
    );
  }

  const {
    categories,
    expenseCategories,
    incomeCategories,
    editingCategoryId,
    categoryName,
    categoryType,
    categoryError,
    openEditCategory,
    cancelCategoryEditor,
    saveCategory,
    deleteCategory:
      deleteCategoryItem,
    setCategoryName,
    setCategoryType,
  } = categoryFinance;

  const {
    budgets,
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
  } = budgetFinance;

  const {
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
  } = recurringFinance;

  const {
    goals,
    goalTransactions,
    goalRows,
    totalGoalAmount,
    totalGoalTarget,
    editingGoalId,
    goalName,
    goalTargetAmount,
    goalTargetDate,
    goalNote,
    goalError,
    goalActionId,
    goalActionType,
    goalActionAmount,
    goalActionAccountId,
    goalActionDate,
    goalActionNote,
    goalActionError,
    openAddGoal,
    openEditGoal,
    cancelGoalEditor,
    saveGoal,
    deleteGoal,
    openGoalAction,
    closeGoalAction,
    saveGoalAction,
    deleteGoalTransaction,
    setGoalName,
    setGoalTargetAmount,
    setGoalTargetDate,
    setGoalNote,
    setGoalActionType,
    setGoalActionAmount,
    setGoalActionAccountId,
    setGoalActionDate,
    setGoalActionNote,
  } = goalFinance;

  const budgetRows =
    budgetFinance.budgetRows;

  function deleteCategory(
    categoryItem: Parameters<
      typeof deleteCategoryItem
    >[0]
  ) {
    deleteCategoryItem(
      categoryItem
    );
  }

  return (
    <div>
      {/* HEADER */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm opacity-50">
            Personal money management
          </p>

          <h3 className="mt-1 text-xl font-bold">
            Finance
          </h3>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={
              openAddTransaction
            }
            disabled={
              accounts.length === 0
            }
            className="rounded-xl bg-[#8f806d] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#7d6f5e] disabled:cursor-not-allowed disabled:opacity-40"
          >
            + Add Transaction
          </button>

          <button
            type="button"
            onClick={openAddAccount}
            className="rounded-xl bg-[#ddd4c7] px-4 py-2.5 text-sm font-medium transition hover:bg-[#cfc3b4]"
          >
            + Account
          </button>
        </div>
      </div>

      {/* DASHBOARD */}
      <FinanceDashboard
        selectedMonth={
          selectedMonth
        }
        onMonthChange={
          setSelectedMonth
        }
        totalBalance={
          totalBalance
        }
        accountCount={
          accounts.length
        }
        monthlyIncome={
          monthlyIncome
        }
        monthlyExpense={
          monthlyExpense
        }
        monthlyNet={monthlyNet}
        monthlyTransactionCount={
          monthlyTransactions.length
        }
        monthlyExpenseByCategory={
          monthlyExpenseByCategoryData
        }
        monthlyIncomeByCategory={
          monthlyIncomeByCategoryData
        }
        largestExpenseCategory={
          largestExpenseCategory?.[0]
        }
        largestExpenseAmount={
          largestExpenseAmount
        }
        accounts={accounts.map(
          (account) => ({
            id: account.id,
            name: account.name,
            type: account.type,
            icon: getAccountTypeInfo(
              account.type
            ).icon,
            balance:
              accountBalances[
                account.id
              ] ?? 0,
          })
        )}
        totalIncome={
          totalIncome
        }
        totalExpense={
          totalExpense
        }
        totalTransactions={
          transactions.length
        }
        formatRupiah={
          formatRupiah
        }
        formatMonth={
          formatMonth
        }
      />

      {/* TRANSACTIONS */}
      <FinanceTransactions
        accounts={accounts}
        accountBalances={
          accountBalances
        }
        transactionTypes={
          transactionTypes
        }
        transactionType={
          transactionType
        }
        transactionAccountId={
          transactionAccountId
        }
        fromAccountId={
          fromAccountId
        }
        toAccountId={toAccountId}
        amount={amount}
        category={category}
        note={note}
        date={date}
        error={error}
        currentCategorySuggestions={
          currentCategorySuggestions
        }
        isTransactionEditorOpen={
          isTransactionEditorOpen
        }
        recentTransactions={
          recentTransactions
        }
        getAccountTypeInfo={
          getAccountTypeInfo
        }
        getTransactionTypeInfo={
          getTransactionTypeInfo
        }
        getAccountName={
          getAccountName
        }
        formatRupiah={
          formatRupiah
        }
        formatDate={formatDate}
        onOpenAddTransaction={
          openAddTransaction
        }
        onCloseTransactionEditor={
          closeTransactionEditor
        }
        onTransactionTypeChange={(
          value
        ) => {
          setTransactionType(
            value
          );
          setCategory("");
          setTransactionError(
            ""
          );
        }}
        onTransactionAccountChange={
          setTransactionAccountId
        }
        onFromAccountChange={
          setFromAccountId
        }
        onToAccountChange={
          setToAccountId
        }
        onAmountChange={
          setAmount
        }
        onCategoryChange={
          setCategory
        }
        onNoteChange={
          setNote
        }
        onDateChange={
          setDate
        }
        onSaveTransaction={
          saveTransaction
        }
        onDeleteTransaction={
          deleteTransaction
        }
      />

      {/* ACCOUNTS */}
      <FinanceAccounts
        accounts={accounts}
        accountBalances={
          accountBalances
        }
        groupedAccounts={
          groupedAccounts
        }
        formatRupiah={
          formatRupiah
        }
        isAccountEditorOpen={
          isAccountEditorOpen
        }
        editingAccountId={
          editingAccountId
        }
        accountName={
          accountName
        }
        accountType={
          accountType
        }
        initialBalance={
          initialBalance
        }
        error={accountError}
        onOpenAddAccount={
          openAddAccount
        }
        onOpenEditAccount={
          openEditAccount
        }
        onCloseAccountEditor={
          closeAccountEditor
        }
        onAccountNameChange={
          setAccountName
        }
        onAccountTypeChange={
          setAccountType
        }
        onInitialBalanceChange={
          setInitialBalance
        }
        onSaveAccount={
          saveAccount
        }
        onDeleteAccount={
          deleteAccount
        }
      />

      {/* BUDGET */}
      <FinanceBudget
        selectedMonth={
          selectedMonth
        }
        onMonthChange={
          setSelectedMonth
        }
        budgets={budgets}
        budgetRows={
          budgetRows
        }
        expenseCategories={
          expenseCategories
        }
        editingBudgetId={
          editingBudgetId
        }
        budgetMonth={
          budgetMonth
        }
        budgetCategory={
          budgetCategory
        }
        budgetAmount={
          budgetAmount
        }
        budgetError={
          budgetError
        }
        onBudgetMonthChange={
          setBudgetMonth
        }
        onBudgetCategoryChange={
          setBudgetCategory
        }
        onBudgetAmountChange={
          setBudgetAmount
        }
        onOpenAddBudget={
          openAddBudget
        }
        onOpenEditBudget={
          openEditBudget
        }
        onCancelBudgetEditor={
          cancelBudgetEditor
        }
        onSaveBudget={
          saveBudget
        }
        onDeleteBudget={
          deleteBudget
        }
        formatRupiah={
          formatRupiah
        }
        formatMonth={
          formatMonth
        }
      />

      {/* RECURRING */}
      <FinanceRecurring
        selectedMonth={
          selectedMonth
        }
        onMonthChange={
          setSelectedMonth
        }
        recurring={recurring}
        accounts={accounts}
        incomeCategories={
          incomeCategories
        }
        expenseCategories={
          expenseCategories
        }
        editingRecurringId={
          editingRecurringId
        }
        recurringType={
          recurringType
        }
        recurringAccountId={
          recurringAccountId
        }
        recurringAmount={
          recurringAmount
        }
        recurringCategory={
          recurringCategory
        }
        recurringNote={
          recurringNote
        }
        recurringDay={
          recurringDay
        }
        recurringError={
          recurringError
        }
        onOpenAddRecurring={
          openAddRecurring
        }
        onOpenEditRecurring={
          openEditRecurring
        }
        onCloseRecurringEditor={
          closeRecurringEditor
        }
        onRecurringTypeChange={(
          value
        ) => {
          setRecurringType(
            value
          );

          setRecurringCategory(
            value === "Income"
              ? incomeCategories[0]
                  ?.name ?? ""
              : expenseCategories[0]
                  ?.name ?? ""
          );
        }}
        onRecurringAccountChange={
          setRecurringAccountId
        }
        onRecurringAmountChange={
          setRecurringAmount
        }
        onRecurringCategoryChange={
          setRecurringCategory
        }
        onRecurringNoteChange={
          setRecurringNote
        }
        onRecurringDayChange={
          setRecurringDay
        }
        onSaveRecurring={
          saveRecurringItem
        }
        onDeleteRecurring={
          deleteRecurringItem
        }
        onToggleRecurring={
          toggleRecurring
        }
        onGenerateRecurring={
          generateRecurring
        }
        formatRupiah={
          formatRupiah
        }
        formatMonth={
          formatMonth
        }
      />

      {/* GOALS */}
      <FinanceGoals
        goals={goals}
        accounts={accounts}
        goalTransactions={
          goalTransactions
        }
        goalRows={goalRows}
        totalGoalAmount={
          totalGoalAmount
        }
        totalGoalTarget={
          totalGoalTarget
        }
        editingGoalId={
          editingGoalId
        }
        goalName={goalName}
        goalTargetAmount={
          goalTargetAmount
        }
        goalTargetDate={
          goalTargetDate
        }
        goalNote={goalNote}
        goalError={
          goalError
        }
        goalActionId={
          goalActionId
        }
        goalActionType={
          goalActionType
        }
        goalActionAmount={
          goalActionAmount
        }
        goalActionAccountId={
          goalActionAccountId
        }
        goalActionDate={
          goalActionDate
        }
        goalActionNote={
          goalActionNote
        }
        goalActionError={
          goalActionError
        }
        onOpenAddGoal={
          openAddGoal
        }
        onOpenEditGoal={
          openEditGoal
        }
        onCancelGoalEditor={
          cancelGoalEditor
        }
        onGoalNameChange={
          setGoalName
        }
        onGoalTargetAmountChange={
          setGoalTargetAmount
        }
        onGoalTargetDateChange={
          setGoalTargetDate
        }
        onGoalNoteChange={
          setGoalNote
        }
        onSaveGoal={
          saveGoal
        }
        onDeleteGoal={
          deleteGoal
        }
        onOpenGoalAction={
          openGoalAction
        }
        onCloseGoalAction={
          closeGoalAction
        }
        onGoalActionTypeChange={
          setGoalActionType
        }
        onGoalActionAmountChange={
          setGoalActionAmount
        }
        onGoalActionAccountChange={
          setGoalActionAccountId
        }
        onGoalActionDateChange={
          setGoalActionDate
        }
        onGoalActionNoteChange={
          setGoalActionNote
        }
        onSaveGoalAction={
          saveGoalAction
        }
        onDeleteGoalTransaction={
          deleteGoalTransaction
        }
        formatRupiah={
          formatRupiah
        }
        formatDate={
          formatDate
        }
      />

      {/* CATEGORIES */}
      <FinanceCategories
        categories={categories}
        expenseCategories={
          expenseCategories
        }
        incomeCategories={
          incomeCategories
        }
        editingCategoryId={
          editingCategoryId
        }
        categoryName={
          categoryName
        }
        categoryType={
          categoryType
        }
        categoryError={
          categoryError
        }
        onCategoryNameChange={
          setCategoryName
        }
        onCategoryTypeChange={
          setCategoryType
        }
        onCancelCategoryEditor={
          cancelCategoryEditor
        }
        onSaveCategory={
          saveCategory
        }
        onOpenEditCategory={
          openEditCategory
        }
        onDeleteCategory={
          deleteCategory
        }
      />

      {/* FOUNDATION NOTE */}
      <section className="mt-6 rounded-2xl border border-[#d8cec0] bg-[#f5f0e8]/70 p-4">
        <p className="text-xs uppercase tracking-widest opacity-40">
          Finance system
        </p>

        <p className="mt-2 text-sm leading-6 opacity-60">
          Income menambah saldo account.
          Expense mengurangi saldo account.
          Transfer hanya memindahkan uang antar
          account sehingga total balance tetap sama.
          Dashboard sekarang juga bisa melihat
          income, expense, net cash flow, dan
          category berdasarkan bulan yang dipilih.
        </p>
      </section>
    </div>
  );
}