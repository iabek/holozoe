"use client";

type FinanceAccount = {
  id: string;
  name: string;
};

type FinanceGoal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  note: string;
  createdAt: string;
  updatedAt: string;
};

type FinanceGoalTransaction = {
  id: string;
  goalId: string;
  type: "Contribution" | "Withdrawal";
  amount: number;
  accountId: string;
  date: string;
  note: string;
  createdAt: string;
};

type GoalRow = FinanceGoal & {
  progress: number;
  remaining: number;
};

type Props = {
  goals: FinanceGoal[];
  goalRows: GoalRow[];
  accounts: FinanceAccount[];
  goalTransactions: FinanceGoalTransaction[];

  editingGoalId: string | null;
  goalName: string;
  goalTargetAmount: string;
  goalTargetDate: string;
  goalNote: string;
  goalError: string;

  goalActionId: string | null;
  goalActionType: "Contribution" | "Withdrawal";
  goalActionAmount: string;
  goalActionAccountId: string;
  goalActionDate: string;
  goalActionNote: string;
  goalActionError: string;

  totalGoalAmount: number;
  totalGoalTarget: number;

  onOpenAddGoal: () => void;
  onOpenEditGoal: (goal: FinanceGoal) => void;
  onCancelGoalEditor: () => void;
  onGoalNameChange: (value: string) => void;
  onGoalTargetAmountChange: (value: string) => void;
  onGoalTargetDateChange: (value: string) => void;
  onGoalNoteChange: (value: string) => void;
  onSaveGoal: () => void;
  onDeleteGoal: (goal: FinanceGoal) => void;

  onOpenGoalAction: (
    goal: FinanceGoal,
    type: "Contribution" | "Withdrawal"
  ) => void;
  onCloseGoalAction: () => void;
  onGoalActionTypeChange: (
    value: "Contribution" | "Withdrawal"
  ) => void;
  onGoalActionAmountChange: (value: string) => void;
  onGoalActionAccountChange: (value: string) => void;
  onGoalActionDateChange: (value: string) => void;
  onGoalActionNoteChange: (value: string) => void;
  onSaveGoalAction: () => void;
  onDeleteGoalTransaction: (
    transaction: FinanceGoalTransaction
  ) => void;

  formatRupiah: (amount: number) => string;
  formatDate: (date: string) => string;
};

export default function FinanceGoals(p: Props) {
  return (
    <section className="mt-6 rounded-3xl border border-[#d8cec0] bg-[#f8f4ed] p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest opacity-40">
            Savings
          </p>

          <h4 className="mt-1 text-xl font-bold">
            Savings & Goals
          </h4>

          <p className="mt-1 max-w-2xl text-sm leading-6 opacity-55">
            Pisahkan uang untuk tujuan tertentu tanpa mencatatnya
            sebagai Expense. Kamu bisa menabung, menarik kembali,
            dan melihat progress setiap goal.
          </p>
        </div>

        <button
          type="button"
          onClick={p.onOpenAddGoal}
          className="rounded-xl bg-[#8f806d] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#7d6f5e]"
        >
          + Add Goal
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-4">
          <p className="text-xs opacity-45">Saved in Goals</p>
          <p className="mt-1 text-lg font-bold">
            {p.formatRupiah(p.totalGoalAmount)}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-4">
          <p className="text-xs opacity-45">Total Target</p>
          <p className="mt-1 text-lg font-bold">
            {p.formatRupiah(p.totalGoalTarget)}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-4">
          <p className="text-xs opacity-45">Active Goals</p>
          <p className="mt-1 text-lg font-bold">
            {p.goals.length}
          </p>
        </div>
      </div>

      {p.editingGoalId && (
        <div className="mt-5 rounded-2xl border border-[#d8cec0] bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest opacity-40">
                {p.editingGoalId === "__new__"
                  ? "New goal"
                  : "Edit goal"}
              </p>

              <h5 className="mt-1 text-lg font-semibold">
                Savings Goal
              </h5>
            </div>

            <button
              type="button"
              onClick={p.onCancelGoalEditor}
              className="rounded-lg px-3 py-2 text-xs opacity-60 hover:bg-[#f0ebe3]"
            >
              Close
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-xs opacity-50">
                Goal name
              </span>

              <input
                value={p.goalName}
                onChange={(e) =>
                  p.onGoalNameChange(e.target.value)
                }
                placeholder="Dana Darurat"
                className="w-full rounded-xl border border-[#d8cec0] bg-[#faf8f4] px-3 py-2.5 outline-none focus:border-[#9a8b78]"
              />
            </label>

            <label className="text-sm">
              <span className="mb-1 block text-xs opacity-50">
                Target amount
              </span>

              <input
                type="number"
                min="1"
                step="1000"
                value={p.goalTargetAmount}
                onChange={(e) =>
                  p.onGoalTargetAmountChange(e.target.value)
                }
                placeholder="5000000"
                className="w-full rounded-xl border border-[#d8cec0] bg-[#faf8f4] px-3 py-2.5 outline-none focus:border-[#9a8b78]"
              />
            </label>

            <label className="text-sm">
              <span className="mb-1 block text-xs opacity-50">
                Target date
              </span>

              <input
                type="date"
                value={p.goalTargetDate}
                onChange={(e) =>
                  p.onGoalTargetDateChange(e.target.value)
                }
                className="w-full rounded-xl border border-[#d8cec0] bg-[#faf8f4] px-3 py-2.5 outline-none focus:border-[#9a8b78]"
              />
            </label>

            <label className="text-sm">
              <span className="mb-1 block text-xs opacity-50">
                Note
              </span>

              <input
                value={p.goalNote}
                onChange={(e) =>
                  p.onGoalNoteChange(e.target.value)
                }
                placeholder="Optional"
                className="w-full rounded-xl border border-[#d8cec0] bg-[#faf8f4] px-3 py-2.5 outline-none focus:border-[#9a8b78]"
              />
            </label>
          </div>

          {p.goalError && (
            <p className="mt-3 rounded-xl bg-[#f5e4dc] px-4 py-3 text-sm text-[#8b4e3e]">
              {p.goalError}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={p.onSaveGoal}
              className="rounded-xl bg-[#8f806d] px-4 py-2.5 text-sm font-medium text-white"
            >
              Save Goal
            </button>

            <button
              type="button"
              onClick={p.onCancelGoalEditor}
              className="rounded-xl bg-[#ddd4c7] px-4 py-2.5 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {p.goalActionId && (
        <div className="mt-5 rounded-2xl border border-[#d8cec0] bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest opacity-40">
                Goal transaction
              </p>

              <h5 className="mt-1 text-lg font-semibold">
                {p.goalActionType === "Contribution"
                  ? "Add Savings"
                  : "Withdraw from Goal"}
              </h5>
            </div>

            <button
              type="button"
              onClick={p.onCloseGoalAction}
              className="rounded-lg px-3 py-2 text-xs opacity-60 hover:bg-[#f0ebe3]"
            >
              Close
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">
                Type
              </label>

              <div className="mt-2 grid grid-cols-2 gap-2">
                {(
                  [
                    "Contribution",
                    "Withdrawal",
                  ] as const
                ).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() =>
                      p.onGoalActionTypeChange(type)
                    }
                    className={`rounded-xl border px-3 py-3 text-sm font-medium ${
                      p.goalActionType === type
                        ? "border-[#8f806d] bg-[#8f806d] text-white"
                        : "border-[#d8cec0] bg-white"
                    }`}
                  >
                    {type === "Contribution"
                      ? "Add Savings"
                      : "Withdraw"}
                  </button>
                ))}
              </div>
            </div>

            <label className="text-sm">
              <span className="mb-1 block text-xs opacity-50">
                Account
              </span>

              <select
                value={p.goalActionAccountId}
                onChange={(e) =>
                  p.onGoalActionAccountChange(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-[#d8cec0] bg-[#faf8f4] px-3 py-2.5"
              >
                <option value="">
                  Select account
                </option>

                {p.accounts.map((account) => (
                  <option
                    key={account.id}
                    value={account.id}
                  >
                    {account.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <span className="mb-1 block text-xs opacity-50">
                Amount
              </span>

              <input
                type="number"
                min="1"
                step="1000"
                value={p.goalActionAmount}
                onChange={(e) =>
                  p.onGoalActionAmountChange(
                    e.target.value
                  )
                }
                placeholder="500000"
                className="w-full rounded-xl border border-[#d8cec0] bg-[#faf8f4] px-3 py-2.5"
              />
            </label>

            <label className="text-sm">
              <span className="mb-1 block text-xs opacity-50">
                Date
              </span>

              <input
                type="date"
                value={p.goalActionDate}
                onChange={(e) =>
                  p.onGoalActionDateChange(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-[#d8cec0] bg-[#faf8f4] px-3 py-2.5"
              />
            </label>

            <label className="text-sm md:col-span-2">
              <span className="mb-1 block text-xs opacity-50">
                Note
              </span>

              <input
                value={p.goalActionNote}
                onChange={(e) =>
                  p.onGoalActionNoteChange(
                    e.target.value
                  )
                }
                placeholder="Optional"
                className="w-full rounded-xl border border-[#d8cec0] bg-[#faf8f4] px-3 py-2.5"
              />
            </label>
          </div>

          {p.goalActionError && (
            <p className="mt-3 rounded-xl bg-[#f5e4dc] px-4 py-3 text-sm text-[#8b4e3e]">
              {p.goalActionError}
            </p>
          )}

          <button
            type="button"
            onClick={p.onSaveGoalAction}
            className="mt-4 rounded-xl bg-[#8f806d] px-4 py-2.5 text-sm font-medium text-white"
          >
            Save
          </button>
        </div>
      )}

      <div className="mt-5">
        {p.goals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d8cec0] bg-white p-7 text-center">
            <p className="text-3xl">🏦</p>

            <p className="mt-3 font-semibold">
              Belum ada savings goal.
            </p>

            <p className="mt-1 text-sm opacity-50">
              Buat tujuan seperti Dana Darurat,
              Liburan, atau Laptop Baru.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {p.goalRows.map((goal) => {
              const progress = Math.min(
                100,
                Math.max(0, goal.progress)
              );

              const completed =
                goal.currentAmount >=
                goal.targetAmount;

              return (
                <div
                  key={goal.id}
                  className="rounded-2xl border border-[#ded5c9] bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">
                          {goal.name}
                        </p>

                        {completed && (
                          <span className="rounded-full bg-[#d9e3d8] px-2 py-1 text-[11px] font-medium text-[#587052]">
                            Target reached
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-xs opacity-45">
                        {p.formatRupiah(
                          goal.currentAmount
                        )}{" "}
                        /{" "}
                        {p.formatRupiah(
                          goal.targetAmount
                        )}
                      </p>

                      {goal.targetDate && (
                        <p className="mt-1 text-xs opacity-40">
                          Target date:{" "}
                          {p.formatDate(
                            goal.targetDate
                          )}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-bold">
                        {progress.toFixed(0)}%
                      </p>

                      <p className="text-xs opacity-45">
                        Remaining{" "}
                        {p.formatRupiah(
                          Math.max(
                            0,
                            goal.remaining
                          )
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#eee8df]">
                    <div
                      className="h-full rounded-full bg-[#7c9274]"
                      style={{
                        width: `${progress}%`,
                      }}
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        p.onOpenGoalAction(
                          goal,
                          "Contribution"
                        )
                      }
                      className="rounded-xl bg-[#8f806d] px-3 py-2 text-sm font-medium text-white"
                    >
                      + Add Savings
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        p.onOpenGoalAction(
                          goal,
                          "Withdrawal"
                        )
                      }
                      className="rounded-xl bg-[#ddd4c7] px-3 py-2 text-sm font-medium"
                    >
                      Withdraw
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        p.onOpenEditGoal(goal)
                      }
                      className="rounded-xl bg-[#eee7dd] px-3 py-2 text-sm font-medium"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        p.onDeleteGoal(goal)
                      }
                      className="rounded-xl bg-[#f0e2db] px-3 py-2 text-sm font-medium text-[#8b4e3e]"
                    >
                      Delete
                    </button>
                  </div>

                  {goal.note && (
                    <p className="mt-3 text-xs opacity-45">
                      {goal.note}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {p.goalTransactions.length > 0 && (
        <div className="mt-6">
          <div className="mb-3">
            <p className="text-sm font-semibold">
              Goal History
            </p>

            <p className="text-xs opacity-45">
              Riwayat perpindahan uang ke dan dari goals.
            </p>
          </div>

          <div className="space-y-2">
            {p.goalTransactions
              .slice()
              .sort(
                (a, b) =>
                  b.date.localeCompare(a.date) ||
                  b.createdAt.localeCompare(
                    a.createdAt
                  )
              )
              .slice(0, 20)
              .map((transaction) => {
                const goal = p.goals.find(
                  (item) =>
                    item.id ===
                    transaction.goalId
                );

                const account = p.accounts.find(
                  (item) =>
                    item.id ===
                    transaction.accountId
                );

                return (
                  <div
                    key={transaction.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {goal?.name ??
                          "Unknown goal"}
                      </p>

                      <p className="mt-1 text-xs opacity-45">
                        {transaction.type} ·{" "}
                        {account?.name ??
                          "Unknown account"}{" "}
                        ·{" "}
                        {p.formatDate(
                          transaction.date
                        )}
                      </p>

                      {transaction.note && (
                        <p className="mt-1 text-xs opacity-40">
                          {transaction.note}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <p
                        className={`text-sm font-semibold ${
                          transaction.type ===
                          "Contribution"
                            ? "text-[#52745b]"
                            : "text-[#9a6254]"
                        }`}
                      >
                        {transaction.type ===
                        "Contribution"
                          ? "+"
                          : "-"}
                        {p.formatRupiah(
                          transaction.amount
                        )}
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          p.onDeleteGoalTransaction(
                            transaction
                          )
                        }
                        className="rounded-lg px-2 py-1 text-xs text-[#9a574b] opacity-70 hover:bg-[#f5e8e3]"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <div className="mt-5 rounded-2xl bg-[#eee8df]/70 p-4">
        <p className="text-xs uppercase tracking-widest opacity-40">
          Goal rules
        </p>

        <p className="mt-2 text-xs leading-5 opacity-55">
          Menabung ke goal bukan Expense, dan menarik uang
          dari goal bukan Income. Uang hanya berpindah dari
          account ke goal atau sebaliknya.
        </p>
      </div>
    </section>
  );
}