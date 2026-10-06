"use client";

type AccountType =
  | "Cash"
  | "E-Wallet"
  | "Bank"
  | "Credit Card"
  | "Other";

type FinanceAccount = {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  createdAt: string;
};

type TransactionType =
  | "Income"
  | "Expense"
  | "Transfer";

type FinanceTransactionsProps = {
  accounts: FinanceAccount[];
  accountBalances: Record<string, number>;

  transactionTypes: {
    value: TransactionType;
    label: string;
    icon: string;
  }[];

  transactionType: TransactionType;
  transactionAccountId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  category: string;
  note: string;
  date: string;
  error: string;

  currentCategorySuggestions: {
    id: string;
    name: string;
  }[];

  isTransactionEditorOpen: boolean;

  recentTransactions: {
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
  }[];

  getAccountTypeInfo: (
    type: AccountType
  ) => {
    value: AccountType;
    label: string;
    icon: string;
  };

  getTransactionTypeInfo: (
    type: TransactionType
  ) => {
    value: TransactionType;
    label: string;
    icon: string;
  };

  getAccountName: (
    accountId?: string
  ) => string;

  formatRupiah: (
    amount: number
  ) => string;

  formatDate: (
    date: string
  ) => string;

  onOpenAddTransaction: () => void;
  onCloseTransactionEditor: () => void;

  onTransactionTypeChange: (
    value: TransactionType
  ) => void;

  onTransactionAccountChange: (
    value: string
  ) => void;

  onFromAccountChange: (
    value: string
  ) => void;

  onToAccountChange: (
    value: string
  ) => void;

  onAmountChange: (
    value: string
  ) => void;

  onCategoryChange: (
    value: string
  ) => void;

  onNoteChange: (
    value: string
  ) => void;

  onDateChange: (
    value: string
  ) => void;

  onSaveTransaction: () => void;

  onDeleteTransaction: (
    transaction: {
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
    }
  ) => void;
};

export default function FinanceTransactions({
  accounts,
  accountBalances,
  transactionTypes,
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
  isTransactionEditorOpen,
  recentTransactions,
  getAccountTypeInfo,
  getTransactionTypeInfo,
  getAccountName,
  formatRupiah,
  formatDate,
  onOpenAddTransaction,
  onCloseTransactionEditor,
  onTransactionTypeChange,
  onTransactionAccountChange,
  onFromAccountChange,
  onToAccountChange,
  onAmountChange,
  onCategoryChange,
  onNoteChange,
  onDateChange,
  onSaveTransaction,
  onDeleteTransaction,
}: FinanceTransactionsProps) {
  return (
    <>
      {/* TRANSACTION EDITOR */}
      {isTransactionEditorOpen && (
        <section className="mt-6 rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest opacity-50">
                New transaction
              </p>

              <h4 className="mt-1 text-lg font-bold">
                Add Transaction
              </h4>
            </div>

            <button
              type="button"
              onClick={
                onCloseTransactionEditor
              }
              className="rounded-xl bg-[#ddd4c7] px-4 py-2 text-sm font-medium transition hover:bg-[#cfc3b4]"
            >
              Cancel
            </button>
          </div>

          <div className="mt-5">
            <label
              htmlFor="finance-transaction-type"
              className="text-sm font-medium"
            >
              Transaction Type
            </label>

            <select
              id="finance-transaction-type"
              value={transactionType}
              onChange={(event) => {
                onTransactionTypeChange(
                  event.target.value as TransactionType
                );
              }}
              className="mt-2 w-full rounded-xl border border-[#d8cec0] bg-white px-4 py-3 text-base outline-none focus:border-[#8f806d]"
            >
              {transactionTypes.map(
                (item) => (
                  <option
                    key={item.value}
                    value={item.value}
                  >
                    {item.icon}{" "}
                    {item.label}
                  </option>
                )
              )}
            </select>
          </div>

          {(
            transactionType ===
              "Income" ||
            transactionType ===
              "Expense"
          ) && (
            <div className="mt-4">
              <label
                htmlFor="finance-transaction-account"
                className="text-sm font-medium"
              >
                Account
              </label>

              <select
                id="finance-transaction-account"
                value={
                  transactionAccountId
                }
                onChange={(event) =>
                  onTransactionAccountChange(
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-xl border border-[#d8cec0] bg-white px-4 py-3 text-base outline-none focus:border-[#8f806d]"
              >
                <option value="">
                  Select account
                </option>

                {accounts.map(
                  (account) => (
                    <option
                      key={account.id}
                      value={account.id}
                    >
                      {
                        getAccountTypeInfo(
                          account.type
                        ).icon
                      }{" "}
                      {account.name} —{" "}
                      {formatRupiah(
                        accountBalances[
                          account.id
                        ] ?? 0
                      )}
                    </option>
                  )
                )}
              </select>
            </div>
          )}

          {transactionType ===
            "Transfer" && (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="finance-from-account"
                  className="text-sm font-medium"
                >
                  From Account
                </label>

                <select
                  id="finance-from-account"
                  value={fromAccountId}
                  onChange={(event) =>
                    onFromAccountChange(
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-[#d8cec0] bg-white px-4 py-3 text-base outline-none focus:border-[#8f806d]"
                >
                  <option value="">
                    Select source account
                  </option>

                  {accounts.map(
                    (account) => (
                      <option
                        key={account.id}
                        value={account.id}
                      >
                        {
                          getAccountTypeInfo(
                            account.type
                          ).icon
                        }{" "}
                        {account.name} —{" "}
                        {formatRupiah(
                          accountBalances[
                            account.id
                          ] ?? 0
                        )}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label
                  htmlFor="finance-to-account"
                  className="text-sm font-medium"
                >
                  To Account
                </label>

                <select
                  id="finance-to-account"
                  value={toAccountId}
                  onChange={(event) =>
                    onToAccountChange(
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-[#d8cec0] bg-white px-4 py-3 text-base outline-none focus:border-[#8f806d]"
                >
                  <option value="">
                    Select destination account
                  </option>

                  {accounts
                    .filter(
                      (account) =>
                        account.id !==
                        fromAccountId
                    )
                    .map(
                      (account) => (
                        <option
                          key={
                            account.id
                          }
                          value={
                            account.id
                          }
                        >
                          {
                            getAccountTypeInfo(
                              account.type
                            ).icon
                          }{" "}
                          {account.name} —{" "}
                          {formatRupiah(
                            accountBalances[
                              account.id
                            ] ?? 0
                          )}
                        </option>
                      )
                    )}
                </select>
              </div>
            </div>
          )}

          <div className="mt-4">
            <label
              htmlFor="finance-transaction-amount"
              className="text-sm font-medium"
            >
              Amount
            </label>

            <input
              id="finance-transaction-amount"
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(event) =>
                onAmountChange(
                  event.target.value
                )
              }
              placeholder="e.g. 50000"
              className="mt-2 w-full rounded-xl border border-[#d8cec0] bg-white px-4 py-3 text-base outline-none focus:border-[#8f806d]"
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="finance-transaction-category"
                className="text-sm font-medium"
              >
                Category
              </label>

              <input
                id="finance-transaction-category"
                type="text"
                list={
                  transactionType ===
                  "Income"
                    ? "finance-income-categories"
                    : transactionType ===
                      "Expense"
                    ? "finance-expense-categories"
                    : undefined
                }
                value={category}
                onChange={(event) =>
                  onCategoryChange(
                    event.target.value
                  )
                }
                placeholder={
                  transactionType ===
                  "Transfer"
                    ? "e.g. Pindah tabungan"
                    : "Choose or type your own"
                }
                className="mt-2 w-full rounded-xl border border-[#d8cec0] bg-white px-4 py-3 text-base outline-none focus:border-[#8f806d]"
              />

              {transactionType !==
                "Transfer" && (
                <>
                  <datalist id="finance-income-categories">
                    {currentCategorySuggestions.map(
                      (item) => (
                        <option
                          key={item.id}
                          value={
                            item.name
                          }
                        />
                      )
                    )}
                  </datalist>

                  <datalist id="finance-expense-categories">
                    {currentCategorySuggestions.map(
                      (item) => (
                        <option
                          key={item.id}
                          value={
                            item.name
                          }
                        />
                      )
                    )}
                  </datalist>

                  <p className="mt-2 text-xs opacity-40">
                    Pilih category yang sudah ada atau ketik category baru.
                  </p>
                </>
              )}
            </div>

            <div>
              <label
                htmlFor="finance-transaction-date"
                className="text-sm font-medium"
              >
                Date
              </label>

              <input
                id="finance-transaction-date"
                type="date"
                value={date}
                onChange={(event) =>
                  onDateChange(
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-xl border border-[#d8cec0] bg-white px-4 py-3 text-base outline-none focus:border-[#8f806d]"
              />
            </div>
          </div>

          <div className="mt-4">
            <label
              htmlFor="finance-transaction-note"
              className="text-sm font-medium"
            >
              Note
            </label>

            <textarea
              id="finance-transaction-note"
              value={note}
              onChange={(event) =>
                onNoteChange(
                  event.target.value
                )
              }
              rows={3}
              placeholder="Optional note..."
              className="mt-2 w-full resize-none rounded-xl border border-[#d8cec0] bg-white px-4 py-3 text-base outline-none focus:border-[#8f806d]"
            />
          </div>

          {error && (
            <p className="mt-4 rounded-xl bg-[#ead7d1] px-4 py-3 text-sm text-[#71463d]">
              {error}
            </p>
          )}

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={
                onSaveTransaction
              }
              className="rounded-xl bg-[#8f806d] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#7d6f5e]"
            >
              Save Transaction
            </button>
          </div>
        </section>
      )}

      {/* RECENT TRANSACTIONS */}
      <section className="mt-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-50">
              History
            </p>

            <h3 className="mt-1 text-xl font-bold">
              Recent Transactions
            </h3>
          </div>

          {recentTransactions.length >
            20 && (
            <span className="text-xs opacity-40">
              Showing latest 20
            </span>
          )}
        </div>

        {recentTransactions.length ===
        0 ? (
          <div className="mt-4 rounded-3xl bg-white/60 p-8 text-center shadow-sm">
            <p className="text-3xl">
              📊
            </p>

            <p className="mt-3 font-semibold">
              No transactions yet.
            </p>

            <p className="mt-1 text-sm opacity-50">
              Income, expense, and transfer history will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {recentTransactions.map(
              (transaction) => {
                const typeInfo =
                  getTransactionTypeInfo(
                    transaction.type
                  );

                return (
                  <div
                    key={
                      transaction.id
                    }
                    className="rounded-2xl bg-white/60 p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f5f0e8]">
                          {
                            typeInfo.icon
                          }
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold">
                              {
                                transaction.category ||
                                typeInfo.label
                              }
                            </p>

                            <span className="rounded-full bg-[#eee7dc] px-2 py-1 text-[10px] font-medium">
                              {
                                typeInfo.label
                              }
                            </span>
                          </div>

                          <p className="mt-1 text-xs opacity-50">
                            {formatDate(
                              transaction.date
                            )}
                          </p>

                          {transaction.type ===
                            "Transfer" && (
                            <p className="mt-1 text-sm opacity-70">
                              {getAccountName(
                                transaction.fromAccountId
                              )}{" "}
                              →{" "}
                              {getAccountName(
                                transaction.toAccountId
                              )}
                            </p>
                          )}

                          {(
                            transaction.type ===
                              "Income" ||
                            transaction.type ===
                              "Expense"
                          ) && (
                            <p className="mt-1 text-sm opacity-70">
                              {getAccountName(
                                transaction.accountId
                              )}
                            </p>
                          )}

                          {transaction.note && (
                            <p className="mt-1 text-xs opacity-40">
                              {
                                transaction.note
                              }
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <p
                          className={`text-base font-bold ${
                            transaction.type ===
                            "Income"
                              ? "text-[#5f8068]"
                              : transaction.type ===
                                "Expense"
                              ? "text-[#9a5e54]"
                              : "text-[#746b60]"
                          }`}
                        >
                          {transaction.type ===
                          "Income"
                            ? "+"
                            : transaction.type ===
                              "Expense"
                            ? "-"
                            : ""}
                          {formatRupiah(
                            transaction.amount
                          )}
                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            onDeleteTransaction(
                              transaction
                            )
                          }
                          className="rounded-lg bg-[#ead7d1] px-3 py-2 text-xs font-medium text-[#71463d] transition hover:bg-[#dfc8c1]"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </section>
    </>
  );
}