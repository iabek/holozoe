import { useEffect, useMemo, useState } from "react";
import type { AccountType, FinanceAccount } from "../types";
import {
  ACCOUNT_STORAGE_KEY,
  accountTypes,
  createId,
} from "../utils";
import { saveCurrentLifeGameStorage } from "@/lib/life-game-storage";

type UseFinanceAccountsProps = {
  canDeleteAccount?: (
    account: FinanceAccount
  ) => boolean;
};

export default function useFinanceAccounts(
  props: UseFinanceAccountsProps = {}
) {
  const {
    canDeleteAccount = () => true,
  } = props;

  const [accounts, setAccounts] = useState<
    FinanceAccount[]
  >([]);

  const [
    isAccountEditorOpen,
    setIsAccountEditorOpen,
  ] = useState(false);

  const [
    editingAccountId,
    setEditingAccountId,
  ] = useState<string | null>(null);

  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] =
    useState<AccountType>("E-Wallet");
  const [initialBalance, setInitialBalance] =
    useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const savedAccounts = localStorage.getItem(
      ACCOUNT_STORAGE_KEY
    );

    if (!savedAccounts) return;

    try {
      const parsed = JSON.parse(savedAccounts);

      if (Array.isArray(parsed)) {
        setAccounts(
          parsed.filter(
            (account) =>
              account &&
              typeof account === "object" &&
              typeof account.id === "string" &&
              typeof account.name === "string" &&
              typeof account.type === "string" &&
              typeof account.initialBalance === "number"
          )
        );
      }
    } catch {
      setAccounts([]);
    }
  }, []);

  function notifyUpdate() {
    window.dispatchEvent(
      new Event("life-game-updated")
    );
  }

  async function saveAccounts(
    updatedAccounts: FinanceAccount[]
  ) {
    setAccounts(updatedAccounts);

    localStorage.setItem(
      ACCOUNT_STORAGE_KEY,
      JSON.stringify(updatedAccounts)
    );

    notifyUpdate();

    const result =
      await saveCurrentLifeGameStorage(
        ACCOUNT_STORAGE_KEY
      );

    if (!result.success) {
      console.error(
        "Gagal menyimpan finance accounts ke Supabase:",
        result
      );
    }
  }

  function openAddAccount() {
    setEditingAccountId(null);
    setAccountName("");
    setAccountType("E-Wallet");
    setInitialBalance("");
    setError("");
    setIsAccountEditorOpen(true);
  }

  function openEditAccount(
    account: FinanceAccount
  ) {
    setEditingAccountId(account.id);
    setAccountName(account.name);
    setAccountType(account.type);
    setInitialBalance(
      String(account.initialBalance)
    );
    setError("");
    setIsAccountEditorOpen(true);
  }

  function closeAccountEditor() {
    setIsAccountEditorOpen(false);
    setEditingAccountId(null);
    setAccountName("");
    setAccountType("E-Wallet");
    setInitialBalance("");
    setError("");
  }

  async function saveAccount() {
    const cleanName = accountName.trim();

    if (!cleanName) {
      setError("Nama account wajib diisi.");
      return;
    }

    const parsedBalance = Number(initialBalance);

    if (
      initialBalance.trim() === "" ||
      !Number.isFinite(parsedBalance)
    ) {
      setError("Masukkan saldo yang valid.");
      return;
    }

    if (parsedBalance < 0) {
      setError("Saldo tidak boleh negatif.");
      return;
    }

    const duplicateName = accounts.some(
      (account) =>
        account.id !== editingAccountId &&
        account.name.trim().toLowerCase() ===
          cleanName.toLowerCase()
    );

    if (duplicateName) {
      setError(
        "Nama account tersebut sudah digunakan."
      );
      return;
    }

    if (editingAccountId) {
      await saveAccounts(
        accounts.map((account) =>
          account.id === editingAccountId
            ? {
                ...account,
                name: cleanName,
                type: accountType,
                initialBalance:
                  Math.floor(parsedBalance),
              }
            : account
        )
      );
    } else {
      await saveAccounts([
        ...accounts,
        {
          id: createId(),
          name: cleanName,
          type: accountType,
          initialBalance:
            Math.floor(parsedBalance),
          createdAt:
            new Date().toISOString(),
        },
      ]);
    }

    closeAccountEditor();
  }

  async function deleteAccount(
    account: FinanceAccount
  ) {
    if (!canDeleteAccount(account)) {
      return;
    }

    if (
      !window.confirm(
        `Hapus account "${account.name}"?`
      )
    ) {
      return;
    }

    await saveAccounts(
      accounts.filter(
        (item) => item.id !== account.id
      )
    );
  }

  const groupedAccounts = useMemo(
    () =>
      accountTypes
        .map((accountTypeInfo) => ({
          ...accountTypeInfo,
          accounts: accounts.filter(
            (account) =>
              account.type ===
              accountTypeInfo.value
          ),
        }))
        .filter(
          (group) =>
            group.accounts.length > 0
        ),
    [accounts]
  );

  return {
    accounts,
    setAccounts,
    saveAccounts,

    isAccountEditorOpen,
    editingAccountId,

    accountName,
    accountType,
    initialBalance,
    error,

    groupedAccounts,

    openAddAccount,
    openEditAccount,
    closeAccountEditor,
    saveAccount,
    deleteAccount,

    setAccountName,
    setAccountType,
    setInitialBalance,
    setError,
  };
}