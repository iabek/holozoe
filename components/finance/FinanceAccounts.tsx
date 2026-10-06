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

type FinanceAccountsProps = {
  accounts: FinanceAccount[];
  accountBalances: Record<string, number>;
  groupedAccounts: {
    value: AccountType;
    label: string;
    icon: string;
    accounts: FinanceAccount[];
  }[];
  formatRupiah: (amount: number) => string;

  isAccountEditorOpen: boolean;
  editingAccountId: string | null;

  accountName: string;
  accountType: AccountType;
  initialBalance: string;
  error: string;

  onOpenAddAccount: () => void;
  onOpenEditAccount: (
    account: FinanceAccount
  ) => void;
  onCloseAccountEditor: () => void;

  onAccountNameChange: (
    value: string
  ) => void;

  onAccountTypeChange: (
    value: AccountType
  ) => void;

  onInitialBalanceChange: (
    value: string
  ) => void;

  onSaveAccount: () => void;

  onDeleteAccount: (
    account: FinanceAccount
  ) => void;
};

export default function FinanceAccounts({
  accounts,
  accountBalances,
  groupedAccounts,
  formatRupiah,

  isAccountEditorOpen,
  editingAccountId,

  accountName,
  accountType,
  initialBalance,
  error,

  onOpenAddAccount,
  onOpenEditAccount,
  onCloseAccountEditor,

  onAccountNameChange,
  onAccountTypeChange,
  onInitialBalanceChange,

  onSaveAccount,
  onDeleteAccount,
}: FinanceAccountsProps) {
  return (
    <>
      {/* ACCOUNT EDITOR */}
      {isAccountEditorOpen && (
        <section className="mt-5 rounded-3xl bg-white/60 p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest opacity-50">
                {editingAccountId
                  ? "Edit account"
                  : "New account"}
              </p>

              <h4 className="mt-1 text-lg font-bold">
                {editingAccountId
                  ? "Edit Account"
                  : "Add Account"}
              </h4>
            </div>

            <button
              type="button"
              onClick={
                onCloseAccountEditor
              }
              className="rounded-xl bg-[#ddd4c7] px-4 py-2 text-sm font-medium transition hover:bg-[#cfc3b4]"
            >
              Cancel
            </button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="finance-account-name"
                className="text-sm font-medium"
              >
                Account Name
              </label>

              <input
                id="finance-account-name"
                type="text"
                value={accountName}
                onChange={(event) =>
                  onAccountNameChange(
                    event.target.value
                  )
                }
                placeholder="e.g. DANA"
                className="mt-2 w-full rounded-xl border border-[#d8cec0] bg-white px-4 py-3 text-base outline-none focus:border-[#8f806d]"
              />
            </div>

            <div>
              <label
                htmlFor="finance-account-type"
                className="text-sm font-medium"
              >
                Account Type
              </label>

              <select
                id="finance-account-type"
                value={accountType}
                onChange={(event) =>
                  onAccountTypeChange(
                    event.target
                      .value as AccountType
                  )
                }
                className="mt-2 w-full rounded-xl border border-[#d8cec0] bg-white px-4 py-3 text-base outline-none focus:border-[#8f806d]"
              >
                <option value="Cash">
                  💵 Cash
                </option>

                <option value="E-Wallet">
                  📱 E-Wallet
                </option>

                <option value="Bank">
                  🏦 Bank
                </option>

                <option value="Credit Card">
                  💳 Credit Card
                </option>

                <option value="Other">
                  📦 Other
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="finance-account-balance"
                className="text-sm font-medium"
              >
                Initial Balance
              </label>

              <input
                id="finance-account-balance"
                type="number"
                min="0"
                step="1"
                value={initialBalance}
                onChange={(event) =>
                  onInitialBalanceChange(
                    event.target.value
                  )
                }
                placeholder="e.g. 300000"
                className="mt-2 w-full rounded-xl border border-[#d8cec0] bg-white px-4 py-3 text-base outline-none focus:border-[#8f806d]"
              />

              <p className="mt-2 text-xs opacity-40">
                Masukkan angka tanpa titik
                atau koma.
              </p>
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-xl bg-[#ead7d1] px-4 py-3 text-sm text-[#71463d]">
              {error}
            </p>
          )}

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={onSaveAccount}
              className="rounded-xl bg-[#8f806d] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#7d6f5e]"
            >
              {editingAccountId
                ? "Save Changes"
                : "Save Account"}
            </button>
          </div>
        </section>
      )}

      {/* ACCOUNTS */}
      <section className="mt-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-50">
              Accounts
            </p>

            <h3 className="mt-1 text-xl font-bold">
              Your Money
            </h3>
          </div>

          {accounts.length > 0 && (
            <span className="text-sm opacity-50">
              {accounts.length} account
              {accounts.length !== 1
                ? "s"
                : ""}
            </span>
          )}
        </div>

        {accounts.length === 0 ? (
          <div className="mt-4 rounded-3xl bg-white/60 p-8 text-center shadow-sm">
            <p className="text-4xl">
              💰
            </p>

            <p className="mt-3 font-semibold">
              No accounts yet.
            </p>

            <p className="mt-1 text-sm opacity-50">
              Add your first cash, bank, or
              e-wallet account.
            </p>

            <button
              type="button"
              onClick={
                onOpenAddAccount
              }
              className="mt-5 rounded-xl bg-[#8f806d] px-4 py-2.5 text-sm font-medium text-white"
            >
              + Add First Account
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-6">
            {groupedAccounts.map(
              (group) => (
                <div
                  key={group.value}
                >
                  <div className="mb-2 flex items-center gap-2 px-1">
                    <span>
                      {group.icon}
                    </span>

                    <p className="text-sm font-semibold">
                      {group.label}
                    </p>
                  </div>

                  <div className="space-y-2">
                    {group.accounts.map(
                      (account) => (
                        <div
                          key={
                            account.id
                          }
                          className="rounded-2xl bg-white/60 p-4 shadow-sm"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f5f0e8] text-xl">
                                {group.icon}
                              </div>

                              <div className="min-w-0">
                                <p className="truncate font-semibold">
                                  {
                                    account.name
                                  }
                                </p>

                                <p className="mt-0.5 text-xs opacity-40">
                                  {
                                    account.type
                                  }
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <p className="mr-2 text-lg font-bold">
                                {formatRupiah(
                                  accountBalances[
                                    account.id
                                  ] ?? 0
                                )}
                              </p>

                              <button
                                type="button"
                                onClick={() =>
                                  onOpenEditAccount(
                                    account
                                  )
                                }
                                className="rounded-lg bg-[#ddd4c7] px-3 py-2 text-xs font-medium transition hover:bg-[#cfc3b4]"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  onDeleteAccount(
                                    account
                                  )
                                }
                                className="rounded-lg bg-[#ead7d1] px-3 py-2 text-xs font-medium text-[#71463d] transition hover:bg-[#dfc8c1]"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>
    </>
  );
}