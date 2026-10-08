"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { syncLifeGameStorageFromSupabase } from "@/lib/life-game-storage";

type ProfileStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "banned";

export default function AuthGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [status, setStatus] =
    useState<ProfileStatus | null>(null);

  useEffect(() => {
    let cancelled = false;

    const supabase = createClient();

    async function initializeUser(
      userId: string
    ) {
      try {
        console.log(
          "AUTH GATE: INITIALIZING USER =",
          userId
        );

        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select("status")
          .eq("id", userId)
          .single();

        console.log(
          "AUTH GATE: PROFILE =",
          profile
        );

        console.log(
          "AUTH GATE: PROFILE ERROR =",
          profileError
        );

        if (profileError || !profile) {
          console.error(
            "AUTH GATE: PROFILE NOT FOUND"
          );

          if (!cancelled) {
            setStatus(null);
            setReady(true);
          }

          return;
        }

        const profileStatus =
          profile.status as ProfileStatus;

        console.log(
          "AUTH GATE: STATUS =",
          profileStatus
        );

        if (profileStatus === "approved") {
          console.log(
            "AUTH GATE: WAITING FOR STORAGE SYNC"
          );

          try {
            const result =
              await syncLifeGameStorageFromSupabase();

            console.log(
              "AUTH GATE: STORAGE SYNC RESULT =",
              result
            );
          } catch (syncError) {
            console.error(
              "AUTH GATE: STORAGE SYNC ERROR =",
              syncError
            );
          }

          console.log(
            "AUTH GATE: STORAGE SYNC FINISHED"
          );
        }

        if (!cancelled) {
          setStatus(profileStatus);
          setReady(true);
        }
      } catch (error) {
        console.error(
          "AUTH GATE: USER INITIALIZATION ERROR =",
          error
        );

        if (!cancelled) {
          setReady(true);
        }
      }
    }

    async function initialize() {
      try {
        console.log(
          "AUTH GATE: INITIALIZING"
        );

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        console.log(
          "AUTH GATE: SESSION =",
          session
        );

        console.log(
          "AUTH GATE: SESSION ERROR =",
          sessionError
        );

        if (sessionError || !session?.user) {
          console.log(
            "AUTH GATE: NO SESSION"
          );

          if (!cancelled) {
            setReady(true);
          }

          return;
        }

        console.log(
          "AUTH GATE: SESSION USER =",
          session.user.email
        );

        await initializeUser(
          session.user.id
        );
      } catch (error) {
        console.error(
          "AUTH GATE: INITIALIZATION ERROR =",
          error
        );

        if (!cancelled) {
          setReady(true);
        }
      }
    }

    void initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(
          "AUTH GATE: AUTH EVENT =",
          event
        );

        console.log(
          "AUTH GATE: SESSION =",
          session
        );

        if (
          session?.user &&
          (
            event === "SIGNED_IN" ||
            event === "INITIAL_SESSION" ||
            event === "TOKEN_REFRESHED"
          )
        ) {
          setReady(false);

          setTimeout(() => {
            if (!cancelled) {
              void initializeUser(
                session.user.id
              );
            }
          }, 0);
        }

        if (
          event === "SIGNED_OUT" ||
          !session?.user
        ) {
          if (!cancelled) {
            setStatus(null);
            setReady(true);
          }
        }
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#e8dfd2] text-[#3f382f]">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-[#8a7e70]">
            Life Game
          </p>

          <p className="mt-2 text-sm text-[#746a5e]">
            Loading your life...
          </p>
        </div>
      </main>
    );
  }

  if (status === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#e8dfd2] px-6 text-[#3f382f]">
        <div className="w-full max-w-md rounded-2xl bg-[#f7f2ea] p-8 text-center shadow-sm">
          <p className="text-xs uppercase tracking-[0.25em] text-[#8a7e70]">
            Life Game
          </p>

          <h1 className="mt-3 text-2xl font-bold">
            Profile not found.
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#746a5e]">
            Your account exists, but your Life Game
            profile could not be found.
          </p>
        </div>
      </main>
    );
  }

  if (status === "pending") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#e8dfd2] px-6 text-[#3f382f]">
        <div className="w-full max-w-md rounded-2xl bg-[#f7f2ea] p-8 text-center shadow-sm">
          <p className="text-xs uppercase tracking-[0.25em] text-[#8a7e70]">
            Life Game
          </p>

          <div className="mt-6 text-4xl">
            ⏳
          </div>

          <h1 className="mt-4 text-2xl font-bold">
            Waiting for approval.
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#746a5e]">
            Your account has been created successfully.
            Please wait until your account is approved by
            the administrator.
          </p>

          <p className="mt-5 text-xs text-[#8a7e70]">
            You will be able to enter Life Game once
            your account is approved.
          </p>
        </div>
      </main>
    );
  }

  if (status === "rejected") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#e8dfd2] px-6 text-[#3f382f]">
        <div className="w-full max-w-md rounded-2xl bg-[#f7f2ea] p-8 text-center shadow-sm">
          <p className="text-xs uppercase tracking-[0.25em] text-[#8a7e70]">
            Life Game
          </p>

          <div className="mt-6 text-4xl">
            ✕
          </div>

          <h1 className="mt-4 text-2xl font-bold">
            Access denied.
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#746a5e]">
            Your account has not been approved to enter
            Life Game.
          </p>

          <p className="mt-5 text-xs text-[#8a7e70]">
            Please contact the administrator if you believe
            this is a mistake.
          </p>
        </div>
      </main>
    );
  }

  if (status === "banned") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#e8dfd2] px-6 text-[#3f382f]">
        <div className="w-full max-w-md rounded-2xl bg-[#f7f2ea] p-8 text-center shadow-sm">
          <p className="text-xs uppercase tracking-[0.25em] text-[#8a7e70]">
            Life Game
          </p>

          <div className="mt-6 text-4xl">
            🚫
          </div>

          <h1 className="mt-4 text-2xl font-bold">
            Access Banned.
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#746a5e]">
            Your access to Life Game has been
            suspended.
          </p>

          <p className="mt-5 text-xs leading-5 text-[#8a7e70]">
            Please contact the administrator if you
            believe this was a mistake.
          </p>
        </div>
      </main>
    );
  }

  if (status === "approved") {
    return <>{children}</>;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#e8dfd2] text-[#3f382f]">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-[#8a7e70]">
          Life Game
        </p>

        <p className="mt-2 text-sm text-[#746a5e]">
          Unable to verify your account.
        </p>
      </div>
    </main>
  );
}