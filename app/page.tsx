"use client";

import {
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase";

import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import AuthGate from "@/components/AuthGate";
import GlobalSearch from "@/components/GlobalSearch";
import Dashboard from "@/components/Dashboard";
import Profile from "@/components/Profile";
import Today from "@/components/Today";
import Habits from "@/components/Habits";
import Prayer from "@/components/Prayer";
import Records from "@/components/Records";
import Journal from "@/components/Journal";
import Notes from "@/components/Notes";
import Archive from "@/components/Archive";
import People from "@/components/People";
import PersonArchive from "@/components/PersonArchive";
import Finance from "@/components/Finance";
import Projects from "@/components/Projects";
import Planner from "@/components/Planner";
import Learning from "@/components/Learning";
import Flashcard from "@/components/Flashcard";
import Admin from "@/components/Admin";

export default function Home() {
  const router = useRouter();

  const [authChecked, setAuthChecked] =
    useState(false);

  const [activePage, setActivePage] =
    useState("Dashboard");

  const [selectedPersonId, setSelectedPersonId] =
    useState<string | null>(null);

  const [displayName, setDisplayName] =
    useState("Life Game Player");

  useEffect(() => {
    const supabase = createClient();

    let cancelled = false;

    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) {
        return;
      }

      if (!session) {
        router.replace("/login");
        return;
      }

      setAuthChecked(true);
    }

    void checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          router.replace("/login");
          return;
        }

        setAuthChecked(true);
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [router]);

  function handleNavigate(page: string) {
    setSelectedPersonId(null);
    setActivePage(page);
  }

  function renderPage() {
    if (activePage === "Profile") {
      return (
        <Profile
          onDisplayNameChange={
            setDisplayName
          }
        />
      );
    }

    if (activePage === "Today") {
      return <Today />;
    }

    if (activePage === "Habits") {
      return <Habits />;
    }

    if (activePage === "Prayer") {
      return <Prayer />;
    }

    if (activePage === "Records") {
      return <Records />;
    }

    if (activePage === "Journal") {
      return <Journal />;
    }

    if (activePage === "Notes") {
      return <Notes />;
    }

    if (activePage === "Archive") {
      return (
        <Archive
          onNavigate={
            handleNavigate
          }
        />
      );
    }

    if (activePage === "People") {
      if (selectedPersonId) {
        return (
          <PersonArchive
            personId={
              selectedPersonId
            }
            onBack={() => {
              setSelectedPersonId(
                null
              );
            }}
          />
        );
      }

      return (
        <People
          onOpenPerson={(
            personId
          ) => {
            setSelectedPersonId(
              personId
            );
          }}
        />
      );
    }

    if (activePage === "Finance") {
      return <Finance />;
    }

    if (activePage === "Projects") {
      return <Projects />;
    }

    if (activePage === "Planner") {
      return <Planner />;
    }

    if (activePage === "Learning") {
      return <Learning />;
    }

    if (activePage === "Flashcard") {
      return <Flashcard />;
    }

    if (activePage === "Admin") {
      return <Admin />;
    }

    return (
      <Dashboard
        onNavigate={
          handleNavigate
        }
      />
    );
  }

  if (!authChecked) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#e8dfd2] px-6 text-[#3f382f]">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#746a5e]">
            HOLOZOE
          </p>

          <p className="mt-3 text-sm text-[#8a7e70]">
            Loading...
          </p>
        </div>
      </main>
    );
  }

  return (
    <AuthGate>
      <main className="min-h-screen bg-[#e8dfd2] text-[#3f382f]">
        <div className="flex min-h-screen">
          <Sidebar
            activePage={
              activePage
            }
            onNavigate={
              handleNavigate
            }
          />

          <div className="min-w-0 flex-1 p-5 sm:p-8">
            <div className="mx-auto max-w-6xl">
              <header className="mb-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-widest opacity-50">
                      Life dashboard
                    </p>

                    <h1 className="mt-1 text-3xl font-bold">
                      {activePage}
                    </h1>
                  </div>

                  <GlobalSearch
                    onNavigate={
                      handleNavigate
                    }
                  />
                </div>
              </header>

              {renderPage()}

              <Footer />
            </div>
          </div>
        </div>
      </main>
    </AuthGate>
  );
}