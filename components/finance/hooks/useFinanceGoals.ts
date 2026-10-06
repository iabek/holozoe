import { useEffect, useState } from "react";
import type {
  FinanceAccount,
  FinanceGoal,
  FinanceGoalTransaction,
} from "../types";
import {
  GOAL_STORAGE_KEY,
  GOAL_TRANSACTION_STORAGE_KEY,
  createId,
  getToday,
} from "../utils";
import { saveCurrentLifeGameStorage } from "@/lib/life-game-storage";

type Props = {
  accounts: FinanceAccount[];
};

export default function useFinanceGoals({
  accounts,
}: Props) {
  const [goals, setGoals] =
    useState<FinanceGoal[]>([]);

  const [
    goalTransactions,
    setGoalTransactions,
  ] = useState<
    FinanceGoalTransaction[]
  >([]);

  const [
    editingGoalId,
    setEditingGoalId,
  ] = useState<string | null>(
    null
  );

  const [goalName, setGoalName] =
    useState("");

  const [
    goalTargetAmount,
    setGoalTargetAmount,
  ] = useState("");

  const [
    goalTargetDate,
    setGoalTargetDate,
  ] = useState("");

  const [goalNote, setGoalNote] =
    useState("");

  const [goalError, setGoalError] =
    useState("");

  const [goalActionId, setGoalActionId] =
    useState<string | null>(null);

  const [
    goalActionType,
    setGoalActionType,
  ] = useState<
    "Contribution" | "Withdrawal"
  >("Contribution");

  const [
    goalActionAmount,
    setGoalActionAmount,
  ] = useState("");

  const [
    goalActionAccountId,
    setGoalActionAccountId,
  ] = useState("");

  const [
    goalActionDate,
    setGoalActionDate,
  ] = useState(getToday());

  const [
    goalActionNote,
    setGoalActionNote,
  ] = useState("");

  const [
    goalActionError,
    setGoalActionError,
  ] = useState("");

  useEffect(() => {
    const savedGoals =
      localStorage.getItem(
        GOAL_STORAGE_KEY
      );

    const savedTransactions =
      localStorage.getItem(
        GOAL_TRANSACTION_STORAGE_KEY
      );

    try {
      if (savedGoals) {
        const parsed =
          JSON.parse(savedGoals);

        if (Array.isArray(parsed)) {
          setGoals(parsed);
        }
      }

      if (savedTransactions) {
        const parsed =
          JSON.parse(
            savedTransactions
          );

        if (Array.isArray(parsed)) {
          setGoalTransactions(
            parsed
          );
        }
      }
    } catch {
      setGoals([]);
      setGoalTransactions([]);
    }
  }, []);

  function notifyUpdate() {
    window.dispatchEvent(
      new Event("life-game-updated")
    );
  }

  async function saveGoals(
    updated: FinanceGoal[]
  ) {
    setGoals(updated);

    localStorage.setItem(
      GOAL_STORAGE_KEY,
      JSON.stringify(updated)
    );

    notifyUpdate();

    const result =
      await saveCurrentLifeGameStorage(
        GOAL_STORAGE_KEY
      );

    if (!result.success) {
      console.error(
        "Gagal menyimpan finance goals ke Supabase:",
        result
      );
    }
  }

  async function saveGoalTransactions(
    updated: FinanceGoalTransaction[]
  ) {
    setGoalTransactions(updated);

    localStorage.setItem(
      GOAL_TRANSACTION_STORAGE_KEY,
      JSON.stringify(updated)
    );

    notifyUpdate();

    const result =
      await saveCurrentLifeGameStorage(
        GOAL_TRANSACTION_STORAGE_KEY
      );

    if (!result.success) {
      console.error(
        "Gagal menyimpan finance goal transactions ke Supabase:",
        result
      );
    }
  }

  function resetGoalEditor() {
    setEditingGoalId(null);
    setGoalName("");
    setGoalTargetAmount("");
    setGoalTargetDate("");
    setGoalNote("");
    setGoalError("");
  }

  function openAddGoal() {
    resetGoalEditor();
    setEditingGoalId("__new__");
  }

  function openEditGoal(
    goal: FinanceGoal
  ) {
    setEditingGoalId(goal.id);
    setGoalName(goal.name);
    setGoalTargetAmount(
      String(goal.targetAmount)
    );
    setGoalTargetDate(
      goal.targetDate
    );
    setGoalNote(goal.note);
    setGoalError("");
  }

  function cancelGoalEditor() {
    resetGoalEditor();
  }

  function saveGoal() {
    const cleanName =
      goalName.trim();

    if (!cleanName) {
      setGoalError(
        "Nama goal wajib diisi."
      );
      return;
    }

    const parsedTarget =
      Number(goalTargetAmount);

    if (
      !goalTargetAmount.trim() ||
      !Number.isFinite(parsedTarget) ||
      parsedTarget <= 0
    ) {
      setGoalError(
        "Masukkan target amount yang valid."
      );
      return;
    }

    if (!goalTargetDate) {
      setGoalError(
        "Target date wajib diisi."
      );
      return;
    }

    const old =
      editingGoalId &&
      editingGoalId !== "__new__"
        ? goals.find(
            (goal) =>
              goal.id ===
              editingGoalId
          )
        : undefined;

    const cleanGoal: FinanceGoal = {
      id:
        old?.id ?? createId(),
      name: cleanName,
      targetAmount:
        Math.floor(parsedTarget),
      currentAmount:
        old?.currentAmount ?? 0,
      targetDate:
        goalTargetDate,
      note:
        goalNote.trim(),
      createdAt:
        old?.createdAt ??
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString(),
    };

    saveGoals(
      old
        ? goals.map((goal) =>
            goal.id === old.id
              ? cleanGoal
              : goal
          )
        : [
            cleanGoal,
            ...goals,
          ]
    );

    resetGoalEditor();
  }

  function deleteGoal(
    goal: FinanceGoal
  ) {
    if (
      goalTransactions.some(
        (item) =>
          item.goalId === goal.id
      )
    ) {
      window.alert(
        "Goal ini tidak bisa dihapus karena sudah memiliki history. Hapus history goal terlebih dahulu."
      );
      return;
    }

    if (
      !window.confirm(
        `Hapus goal "${goal.name}"?`
      )
    ) {
      return;
    }

    saveGoals(
      goals.filter(
        (item) =>
          item.id !== goal.id
      )
    );

    if (
      editingGoalId === goal.id
    ) {
      resetGoalEditor();
    }
  }

  function openGoalAction(
    goal: FinanceGoal,
    type:
      | "Contribution"
      | "Withdrawal"
  ) {
    setGoalActionId(goal.id);
    setGoalActionType(type);
    setGoalActionAmount("");
    setGoalActionAccountId(
      accounts[0]?.id ?? ""
    );
    setGoalActionDate(getToday());
    setGoalActionNote("");
    setGoalActionError("");
  }

  function closeGoalAction() {
    setGoalActionId(null);
    setGoalActionType(
      "Contribution"
    );
    setGoalActionAmount("");
    setGoalActionAccountId("");
    setGoalActionDate(getToday());
    setGoalActionNote("");
    setGoalActionError("");
  }

  function saveGoalAction() {
    if (!goalActionId) {
      setGoalActionError(
        "Pilih goal terlebih dahulu."
      );
      return;
    }

    const goal = goals.find(
      (item) =>
        item.id === goalActionId
    );

    if (!goal) {
      setGoalActionError(
        "Goal tidak ditemukan."
      );
      return;
    }

    if (
      !goalActionAccountId ||
      !accounts.some(
        (a) =>
          a.id ===
          goalActionAccountId
      )
    ) {
      setGoalActionError(
        "Pilih account terlebih dahulu."
      );
      return;
    }

    const parsedAmount =
      Number(goalActionAmount);

    if (
      !goalActionAmount.trim() ||
      !Number.isFinite(
        parsedAmount
      ) ||
      parsedAmount <= 0
    ) {
      setGoalActionError(
        "Masukkan nominal yang valid."
      );
      return;
    }

    if (!goalActionDate) {
      setGoalActionError(
        "Tanggal transaksi wajib diisi."
      );
      return;
    }

    const cleanAmount =
      Math.floor(parsedAmount);

    if (
      goalActionType ===
        "Withdrawal" &&
      cleanAmount >
        goal.currentAmount
    ) {
      setGoalActionError(
        "Nominal withdrawal melebihi saldo goal saat ini."
      );
      return;
    }

    const transaction:
      FinanceGoalTransaction = {
      id: createId(),
      goalId: goal.id,
      type: goalActionType,
      amount: cleanAmount,
      accountId:
        goalActionAccountId,
      date: goalActionDate,
      note:
        goalActionNote.trim(),
      createdAt:
        new Date().toISOString(),
    };

    const currentAmount =
      goalActionType ===
      "Contribution"
        ? goal.currentAmount +
          cleanAmount
        : goal.currentAmount -
          cleanAmount;

    saveGoals(
      goals.map((item) =>
        item.id === goal.id
          ? {
              ...item,
              currentAmount:
                Math.max(
                  0,
                  currentAmount
                ),
              updatedAt:
                new Date().toISOString(),
            }
          : item
      )
    );

    saveGoalTransactions([
      transaction,
      ...goalTransactions,
    ]);

    closeGoalAction();
  }

  function deleteGoalTransaction(
    transaction: FinanceGoalTransaction
  ) {
    if (
      !window.confirm(
        "Hapus history goal ini? Perubahan saldo goal dan account akan dibalik otomatis."
      )
    ) {
      return;
    }

    const goal = goals.find(
      (item) =>
        item.id ===
        transaction.goalId
    );

    if (goal) {
      const reversedAmount =
        transaction.type ===
        "Contribution"
          ? goal.currentAmount -
            transaction.amount
          : goal.currentAmount +
            transaction.amount;

      saveGoals(
        goals.map((item) =>
          item.id === goal.id
            ? {
                ...item,
                currentAmount:
                  Math.max(
                    0,
                    reversedAmount
                  ),
                updatedAt:
                  new Date().toISOString(),
              }
            : item
        )
      );
    }

    saveGoalTransactions(
      goalTransactions.filter(
        (item) =>
          item.id !==
          transaction.id
      )
    );

    if (
      goalActionId ===
      transaction.goalId
    ) {
      closeGoalAction();
    }
  }

  const goalRows = goals.map(
    (goal) => ({
      ...goal,
      progress:
        goal.targetAmount > 0
          ? (goal.currentAmount /
              goal.targetAmount) *
            100
          : 0,
      remaining:
        goal.targetAmount -
        goal.currentAmount,
    })
  );

  const totalGoalAmount =
    goals.reduce(
      (total, goal) =>
        total +
        goal.currentAmount,
      0
    );

  const totalGoalTarget =
    goals.reduce(
      (total, goal) =>
        total +
        goal.targetAmount,
      0
    );

  return {
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
  };
}