"use client";

type ArchiveFolder = {
  icon: string;
  name: string;
  description: string;
};

type ArchiveProps = {
  onNavigate: (page: string) => void;
};

const folders: ArchiveFolder[] = [
  {
    icon: "👥",
    name: "People",
    description: "People who became part of your story.",
  },
  {
    icon: "📸",
    name: "Memories",
    description: "Moments worth keeping.",
  },
  {
    icon: "🎬",
    name: "Movies & Series",
    description: "Films and series you want to remember.",
  },
  {
    icon: "📚",
    name: "Books",
    description: "Books, quotes, and things you've read.",
  },
  {
    icon: "🎵",
    name: "Music",
    description: "Songs, albums, and memories attached to them.",
  },
  {
    icon: "✈️",
    name: "Travel",
    description: "Places you've visited and journeys you've taken.",
  },
];

export default function Archive({
  onNavigate,
}: ArchiveProps) {
  function handleFolderClick(name: string) {
    if (name === "People") {
      onNavigate("People");
    }
  }

  return (
    <section>
      {/* HEADER */}
      <div className="rounded-2xl bg-[#f7f2ea] p-6 shadow-sm sm:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[#8a7e70]">
          Archive
        </p>

        <h2 className="mt-2 text-2xl font-bold text-[#3f382f]">
          Things worth keeping.
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#746a5e]">
          A place for the people, memories, and pieces of
          your life that you want to keep with you.
        </p>
      </div>

      {/* FOLDERS */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {folders.map((folder) => (
          <button
            key={folder.name}
            type="button"
            onClick={() =>
              handleFolderClick(folder.name)
            }
            className="group rounded-2xl border border-[#d8cec0] bg-[#f7f2ea] p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-[#f2ece3]"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#ebe3d8] text-2xl">
                {folder.icon}
              </div>

              <span className="text-sm text-[#b0a496] transition group-hover:translate-x-0.5">
                →
              </span>
            </div>

            <h3 className="mt-5 font-semibold text-[#3f382f]">
              {folder.name}
            </h3>

            <p className="mt-1 text-sm leading-5 text-[#746a5e]">
              {folder.description}
            </p>
          </button>
        ))}
      </div>

      {/* FUTURE */}
      <div className="mt-6 rounded-2xl border border-dashed border-[#d8cec0] bg-[#eee7dc] p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-[#8a7e70]">
          More to come
        </p>

        <p className="mt-2 text-sm leading-6 text-[#746a5e]">
          Your archive can grow as your life grows.
          New folders can be added whenever they become
          meaningful.
        </p>
      </div>
    </section>
  );
}