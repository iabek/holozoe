"use client";

import {
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase";

type SidebarProps = {
  activePage: string;
  onNavigate: (page: string) => void;
};

type MenuIconName =
  | "home"
  | "clipboard"
  | "calendar"
  | "journal"
  | "notes"
  | "archive"
  | "learning"
  | "flashcard"
  | "finance"
  | "projects"
  | "habits"
  | "prayer"
  | "health"
  | "history"
  | "screen-time"
  | "admin";

const menuSections: {
  title: string;
  items: {
    name: string;
    icon: MenuIconName;
  }[];
}[] = [
  {
    title: "MAIN",
    items: [
      {
        name: "Dashboard",
        icon: "home",
      },
      {
        name: "Today",
        icon: "clipboard",
      },
      {
        name: "Planner",
        icon: "calendar",
      },
    ],
  },
  {
    title: "PERSONAL",
    items: [
      {
        name: "Journal",
        icon: "journal",
      },
      {
        name: "Notes",
        icon: "notes",
      },
      {
        name: "Archive",
        icon: "archive",
      },
      {
        name: "Learning",
        icon: "learning",
      },
      {
        name: "Flashcard",
        icon: "flashcard",
      },
      {
        name: "Finance",
        icon: "finance",
      },
      {
        name: "Projects",
        icon: "projects",
      },
    ],
  },
  {
    title: "LIFE",
    items: [
      {
        name: "Habits",
        icon: "habits",
      },
      {
        name: "Prayer",
        icon: "prayer",
      },
      {
        name: "Health",
        icon: "health",
      },
    ],
  },
  {
    title: "TRACKING",
    items: [
      {
        name: "History",
        icon: "history",
      },
      {
        name: "Screen Time",
        icon: "screen-time",
      },
    ],
  },
];

function MenuIcon({
  name,
  size = 18,
}: {
  name: MenuIconName;
  size?: number;
}) {
  const commonProps = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "home":
      return (
        <svg {...commonProps}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5.5 9.5V21h13V9.5" />
          <path d="M9.5 21v-7h5v7" />
        </svg>
      );

    case "clipboard":
      return (
        <svg {...commonProps}>
          <rect
            x="5"
            y="4.5"
            width="14"
            height="17"
            rx="2"
          />
          <path d="M9 4.5V3h6v1.5" />
          <path d="M8.5 10h7" />
          <path d="M8.5 14h7" />
          <path d="M8.5 18h4.5" />
        </svg>
      );

    case "calendar":
      return (
        <svg {...commonProps}>
          <rect
            x="3.5"
            y="5"
            width="17"
            height="16"
            rx="2"
          />
          <path d="M16 3v4" />
          <path d="M8 3v4" />
          <path d="M3.5 9h17" />
          <path d="M8 13h.01" />
          <path d="M12 13h.01" />
          <path d="M16 13h.01" />
          <path d="M8 17h.01" />
          <path d="M12 17h.01" />
        </svg>
      );

    case "journal":
      return (
        <svg {...commonProps}>
          <path d="M5 4.5h11.5A2.5 2.5 0 0 1 19 7v13H7a2 2 0 0 1-2-2V4.5Z" />
          <path d="M7 20h12" />
          <path d="M8.5 8h6.5" />
          <path d="M8.5 11.5h6.5" />
          <path d="M8.5 15h4" />
        </svg>
      );

    case "notes":
      return (
        <svg {...commonProps}>
          <path d="M6 4h12a1.5 1.5 0 0 1 1.5 1.5v13A1.5 1.5 0 0 1 18 20H6a1.5 1.5 0 0 1-1.5-1.5v-13A1.5 1.5 0 0 1 6 4Z" />
          <path d="M8 8h8" />
          <path d="M8 11.5h8" />
          <path d="M8 15h5" />
        </svg>
      );

    case "archive":
      return (
        <svg {...commonProps}>
          <path d="M4 6h16" />
          <path d="M5 6v13h14V6" />
          <path d="M6 3h12l1 3H5l1-3Z" />
          <path d="M9 11h6" />
        </svg>
      );

    case "learning":
      return (
        <svg {...commonProps}>
          <path d="M3.5 5.5 12 3l8.5 2.5L12 8 3.5 5.5Z" />
          <path d="M6 7v5.5c0 1.4 2.7 3 6 3s6-1.6 6-3V7" />
          <path d="M20.5 6v7" />
          <path d="M20.5 15.5v.1" />
        </svg>
      );

    case "flashcard":
      return (
        <svg {...commonProps}>
          <rect
            x="5"
            y="7"
            width="13"
            height="10"
            rx="1.5"
          />
          <path d="M8 4.5h10.5A1.5 1.5 0 0 1 20 6v8" />
          <path d="M9 11h5" />
          <path d="M9 13.5h3" />
        </svg>
      );

    case "finance":
      return (
        <svg {...commonProps}>
          <rect
            x="3.5"
            y="5"
            width="17"
            height="14"
            rx="2"
          />
          <path d="M3.5 9h17" />
          <path d="M7 14h3" />
          <path d="M15 14h2" />
          <path d="M6.5 3h10" />
        </svg>
      );

    case "projects":
      return (
        <svg {...commonProps}>
          <path d="M4 7.5h6l1.5-2H20v13H4v-11Z" />
          <path d="M4 7.5h16" />
          <path d="M9 12h6" />
          <path d="M12 9v6" />
        </svg>
      );

    case "habits":
      return (
        <svg {...commonProps}>
          <rect
            x="4"
            y="4"
            width="16"
            height="16"
            rx="3"
          />
          <path d="m8 12 2.5 2.5L16 9" />
        </svg>
      );

    case "prayer":
      return (
        <svg {...commonProps}>
          <path d="M5 20h14" />
          <path d="M7 20V9.5L12 6l5 3.5V20" />
          <path d="M10 20v-5h4v5" />
          <path d="M12 3v3" />
          <path d="M10.5 4.5h3" />
        </svg>
      );

    case "health":
      return (
        <svg {...commonProps}>
          <path d="M20.8 8.6c0 5.5-8.8 11-8.8 11S3.2 14.1 3.2 8.6A4.8 4.8 0 0 1 12 5.4a4.8 4.8 0 0 1 8.8 3.2Z" />
          <path d="M12 8v5" />
          <path d="M9.5 10.5h5" />
        </svg>
      );

    case "history":
      return (
        <svg {...commonProps}>
          <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" />
          <path d="M3.5 5v5h5" />
          <path d="M12 7v5l3 2" />
        </svg>
      );

    case "screen-time":
      return (
        <svg {...commonProps}>
          <rect
            x="5"
            y="3"
            width="14"
            height="18"
            rx="2.5"
          />
          <path d="M9 7h6" />
          <path d="M9 11h6" />
          <path d="M9 15h3" />
          <circle
            cx="16"
            cy="16"
            r="2.5"
          />
          <path d="M16 14.5V16l1 1" />
        </svg>
      );

    case "admin":
      return (
        <svg {...commonProps}>
          <circle
            cx="12"
            cy="12"
            r="3"
          />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.5 1.5-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V20h-2.1v-.4a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-1.5-1.5.1-.1A1.7 1.7 0 0 0 9 15a1.7 1.7 0 0 0-1.5-1H7.1v-2.1h.4A1.7 1.7 0 0 0 9 11a1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.5-1.5.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V6h2.1v.4a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.5 1.5-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.4V14h-.4a1.7 1.7 0 0 0-1.5 1Z" />
        </svg>
      );

    default:
      return null;
  }
}

function ProfileIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle
        cx="12"
        cy="8"
        r="3"
      />
      <path d="M5 20c0-3.3 3.1-5 7-5s7 1.7 7 5" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
      <path d="M21 5v14" />
    </svg>
  );
}

function MenuButtonIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
    >
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
    >
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
    >
      <circle
        cx="11"
        cy="11"
        r="6.5"
      />
      <path d="m16 16 4 4" />
    </svg>
  );
}

export default function Sidebar({
  activePage,
  onNavigate,
}: SidebarProps) {
  const router = useRouter();

  const [displayName, setDisplayName] =
    useState("HOLOZOE Player");

  const [isAdmin, setIsAdmin] =
    useState(false);

  const [mobileOpen, setMobileOpen] =
    useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function loadProfile() {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) return;

      const { data, error } =
        await supabase
          .from("profiles")
          .select(
            "display_name, is_admin"
          )
          .eq("id", user.id)
          .single();

      if (error) {
        console.error(
          "SIDEBAR PROFILE ERROR:",
          error
        );

        return;
      }

      setDisplayName(
        data?.display_name?.trim() ||
          "HOLOZOE Player"
      );

      setIsAdmin(
        data?.is_admin === true
      );
    }

    loadProfile();

    function handleProfileUpdated(
      event: Event
    ) {
      const customEvent =
        event as CustomEvent<{
          displayName?: string;
        }>;

      const newName =
        customEvent.detail?.displayName?.trim();

      if (newName) {
        setDisplayName(
          newName
        );
      }
    }

    window.addEventListener(
      "life-game-profile-updated",
      handleProfileUpdated
    );

    return () => {
      window.removeEventListener(
        "life-game-profile-updated",
        handleProfileUpdated
      );
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [activePage]);

  useEffect(() => {
    if (!mobileOpen) return;

    function handleEscape(
      event: KeyboardEvent
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        setMobileOpen(false);
      }
    }

    document.addEventListener(
      "keydown",
      handleEscape
    );

    document.body.style.overflow =
      "hidden";

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );

      document.body.style.overflow =
        "";
    };
  }, [mobileOpen]);

  async function handleLogout() {
    const confirmed =
      window.confirm(
        "Logout dari HOLOZOE?\n\nProgress kamu tetap tersimpan."
      );

    if (!confirmed) return;

    const supabase = createClient();

    const { error } =
      await supabase.auth.signOut();

    if (error) {
      console.error(
        "LOGOUT ERROR:",
        error
      );

      return;
    }

    router.push("/login");
    router.refresh();
  }

  function handleMobileNavigate(
    page: string
  ) {
    setMobileOpen(false);
    onNavigate(page);
  }

  function renderMenu(
    mobile = false
  ) {
    return (
      <>
        {menuSections.map(
          (section) => (
            <div
              key={
                section.title
              }
            >
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-[#8a7e70]">
                {section.title}
              </p>

              <div className="space-y-1">
                {section.items.map(
                  (item) => {
                    const active =
                      activePage ===
                      item.name;

                    return (
                      <button
                        key={
                          item.name
                        }
                        type="button"
                        onClick={() =>
                          mobile
                            ? handleMobileNavigate(
                                item.name
                              )
                            : onNavigate(
                                item.name
                              )
                        }
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                          active
                            ? "bg-[#d8cec0] font-semibold text-[#3f382f]"
                            : "text-[#3f382f] hover:bg-[#e4dbcf]"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center ${
                            active
                              ? "text-[#554c42]"
                              : "text-[#8a7e70]"
                          }`}
                        >
                          <MenuIcon
                            name={
                              item.icon
                            }
                            size={
                              17
                            }
                          />
                        </span>

                        <span>
                          {
                            item.name
                          }
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          )
        )}

        {isAdmin && (
          <div>
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-[#8a7e70]">
              SYSTEM
            </p>

            <button
              type="button"
              onClick={() =>
                mobile
                  ? handleMobileNavigate(
                      "Admin"
                    )
                  : onNavigate(
                      "Admin"
                    )
              }
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                activePage ===
                "Admin"
                  ? "bg-[#d8cec0] font-semibold text-[#3f382f]"
                  : "text-[#3f382f] hover:bg-[#e4dbcf]"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center ${
                  activePage ===
                  "Admin"
                    ? "text-[#554c42]"
                    : "text-[#8a7e70]"
                }`}
              >
                <MenuIcon
                  name="admin"
                  size={17}
                />
              </span>

              <span>
                Admin
              </span>
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-[#d8cec0] bg-[#eee7dc] p-5 md:flex">
        {/* BRAND */}
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f7f2ea]">
              <img
                src="/zoe.png"
                alt="Zoe"
                className="h-full w-full object-contain"
              />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-wide text-[#3f382f]">
                HOLOZOE
              </p>

              <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-[#8a7e70]">
                Life, fully lived.
              </p>
            </div>
          </div>
        </div>

        {/* PROFILE */}
        <button
          type="button"
          onClick={() =>
            onNavigate("Profile")
          }
          className={`mt-6 flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left shadow-sm transition ${
            activePage ===
            "Profile"
              ? "border-[#c8bbaa] bg-[#f7f2ea]"
              : "border-[#d8cec0] bg-[#f7f2ea] hover:bg-[#f2ece3]"
          }`}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d8cec0] text-[#746a5e]">
            <ProfileIcon />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#3f382f]">
              {displayName}
            </p>

            <p className="text-xs text-[#8a7e70]">
              Profile
            </p>
          </div>
        </button>

        {/* MENU */}
        <nav className="mt-7 flex-1 space-y-6">
          {renderMenu()}
        </nav>

        {/* LOGOUT */}
        <div className="mt-6 border-t border-[#d8cec0] pt-4">
          <button
            type="button"
            onClick={
              handleLogout
            }
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-[#765d55] transition hover:bg-[#e4dbcf]"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center">
              <LogoutIcon />
            </span>

            <span>
              Logout
            </span>
          </button>
        </div>
      </aside>

      {/* MOBILE TOP BAR */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-[#d8cec0] bg-[#eee7dc]/95 px-4 backdrop-blur md:hidden">
        <button
          type="button"
          onClick={() =>
            setMobileOpen(true)
          }
          aria-label="Open menu"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-[#3f382f] transition hover:bg-[#e4dbcf]"
        >
          <MenuButtonIcon />
        </button>

        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-[#f7f2ea]">
            <img
              src="/zoe.png"
              alt="Zoe"
              className="h-full w-full object-contain"
            />
          </div>

          <div>
            <p className="text-sm font-semibold tracking-wide text-[#3f382f]">
              HOLOZOE
            </p>

            <p className="text-[8px] uppercase tracking-[0.12em] text-[#8a7e70]">
              Life, fully lived.
            </p>
          </div>
        </div>

        <div className="flex h-10 w-10 items-center justify-center text-[#746a5e]">
          <SearchIcon />
        </div>
      </div>

      {/* MOBILE OVERLAY */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() =>
            setMobileOpen(false)
          }
          className="fixed inset-0 z-40 bg-[#3f382f]/25 md:hidden"
        />
      )}

      {/* MOBILE DRAWER */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(82vw,20rem)] flex-col border-r border-[#d8cec0] bg-[#eee7dc] p-5 shadow-2xl transition-transform duration-200 ease-out md:hidden ${
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        {/* MOBILE DRAWER HEADER */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f7f2ea]">
              <img
                src="/zoe.png"
                alt="Zoe"
                className="h-full w-full object-contain"
              />
            </div>

            <div>
              <p className="text-sm font-semibold tracking-wide text-[#3f382f]">
                HOLOZOE
              </p>

              <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-[#8a7e70]">
                Life, fully lived.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setMobileOpen(false)
            }
            aria-label="Close menu"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[#746a5e] transition hover:bg-[#e4dbcf]"
          >
            <CloseIcon />
          </button>
        </div>

        {/* MOBILE PROFILE */}
        <button
          type="button"
          onClick={() =>
            handleMobileNavigate(
              "Profile"
            )
          }
          className={`mt-6 flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left shadow-sm transition ${
            activePage ===
            "Profile"
              ? "border-[#c8bbaa] bg-[#f7f2ea]"
              : "border-[#d8cec0] bg-[#f7f2ea] hover:bg-[#f2ece3]"
          }`}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d8cec0] text-[#746a5e]">
            <ProfileIcon />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#3f382f]">
              {displayName}
            </p>

            <p className="text-xs text-[#8a7e70]">
              Profile
            </p>
          </div>
        </button>

        {/* MOBILE MENU */}
        <nav className="mt-7 flex-1 space-y-6 overflow-y-auto pr-1">
          {renderMenu(true)}
        </nav>

        {/* MOBILE LOGOUT */}
        <div className="mt-6 border-t border-[#d8cec0] pt-4">
          <button
            type="button"
            onClick={
              handleLogout
            }
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-[#765d55] transition hover:bg-[#e4dbcf]"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center">
              <LogoutIcon />
            </span>

            <span>
              Logout
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}