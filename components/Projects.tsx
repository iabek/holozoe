"use client";

import { useEffect, useMemo, useState } from "react";
import { saveCurrentLifeGameStorage } from "@/lib/life-game-storage";

type ProjectStatus =
  | "Planning"
  | "Active"
  | "On Hold"
  | "Completed";

type Project = {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  progress: number;
  targetDate: string;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY =
  "life-game-projects";

const STATUS_OPTIONS: ProjectStatus[] = [
  "Planning",
  "Active",
  "On Hold",
  "Completed",
];

function formatDate(
  dateString: string
) {
  if (!dateString)
    return "No target date";

  const date = new Date(
    `${dateString}T00:00:00`
  );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "No target date";
  }

  return date.toLocaleDateString(
    "id-ID",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

function getStatusClass(
  status: ProjectStatus
) {
  if (status === "Completed") {
    return "bg-[#dfe7dc] text-[#50614c]";
  }

  if (status === "Active") {
    return "bg-[#e4ddd1] text-[#665847]";
  }

  if (status === "On Hold") {
    return "bg-[#eadfd7] text-[#765e51]";
  }

  return "bg-[#e8e1d8] text-[#746a5e]";
}

export default function Projects() {
  const [projects, setProjects] =
    useState<Project[]>([]);

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState<
      "All" | ProjectStatus
    >("All");

  const [
    isEditorOpen,
    setIsEditorOpen,
  ] = useState(false);

  const [
    editingId,
    setEditingId,
  ] = useState<string | null>(
    null
  );

  const [title, setTitle] =
    useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [status, setStatus] =
    useState<ProjectStatus>(
      "Planning"
    );

  const [progress, setProgress] =
    useState(0);

  const [
    targetDate,
    setTargetDate,
  ] = useState("");

  useEffect(() => {
    const saved =
      localStorage.getItem(
        STORAGE_KEY
      );

    if (!saved) return;

    try {
      const parsed =
        JSON.parse(saved);

      if (
        Array.isArray(parsed)
      ) {
        setProjects(
          parsed.filter(
            (
              project
            ): project is Project =>
              project &&
              typeof project ===
                "object" &&
              typeof project.id ===
                "string" &&
              typeof project.title ===
                "string" &&
              typeof project.description ===
                "string" &&
              STATUS_OPTIONS.includes(
                project.status
              ) &&
              typeof project.progress ===
                "number" &&
              typeof project.targetDate ===
                "string" &&
              typeof project.createdAt ===
                "string" &&
              typeof project.updatedAt ===
                "string"
          )
        );
      }
    } catch {
      setProjects([]);
    }
  }, []);

  async function saveProjects(
    updatedProjects: Project[]
  ) {
    setProjects(
      updatedProjects
    );

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        updatedProjects
      )
    );

    window.dispatchEvent(
      new Event(
        "life-game-updated"
      )
    );

    const result =
      await saveCurrentLifeGameStorage(
        STORAGE_KEY
      );

    if (!result.success) {
      console.error(
        "Gagal menyimpan Projects ke Supabase:",
        result
      );
    }
  }

  function resetEditor() {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setStatus("Planning");
    setProgress(0);
    setTargetDate("");
  }

  function openNewProject() {
    resetEditor();
    setIsEditorOpen(true);
  }

  function openEditProject(
    project: Project
  ) {
    setEditingId(project.id);
    setTitle(project.title);
    setDescription(
      project.description
    );
    setStatus(project.status);
    setProgress(
      project.progress
    );
    setTargetDate(
      project.targetDate
    );
    setIsEditorOpen(true);
  }

  function closeEditor() {
    setIsEditorOpen(false);
    resetEditor();
  }

  function saveProject() {
    const cleanTitle =
      title.trim();

    if (!cleanTitle) return;

    const now =
      new Date().toISOString();

    if (editingId) {
      const updatedProjects =
        projects.map(
          (project) => {
            if (
              project.id !==
              editingId
            ) {
              return project;
            }

            return {
              ...project,
              title: cleanTitle,
              description:
                description.trim(),
              status,
              progress:
                status ===
                "Completed"
                  ? 100
                  : Math.min(
                      100,
                      Math.max(
                        0,
                        progress
                      )
                    ),
              targetDate,
              updatedAt: now,
            };
          }
        );

      saveProjects(
        updatedProjects
      );
    } else {
      const newProject: Project = {
        id: `${Date.now()}-${Math.random()}`,
        title: cleanTitle,
        description:
          description.trim(),
        status,
        progress:
          status === "Completed"
            ? 100
            : Math.min(
                100,
                Math.max(
                  0,
                  progress
                )
              ),
        targetDate,
        createdAt: now,
        updatedAt: now,
      };

      saveProjects([
        newProject,
        ...projects,
      ]);
    }

    closeEditor();
  }

  function deleteProject(
    projectId: string
  ) {
    const project =
      projects.find(
        (item) =>
          item.id ===
          projectId
      );

    if (!project) return;

    const confirmed =
      window.confirm(
        `Hapus project "${project.title}"?`
      );

    if (!confirmed) return;

    saveProjects(
      projects.filter(
        (item) =>
          item.id !==
          projectId
      )
    );

    if (
      editingId ===
      projectId
    ) {
      closeEditor();
    }
  }

  function updateProgress(
    project: Project,
    nextProgress: number
  ) {
    const safeProgress =
      Math.min(
        100,
        Math.max(
          0,
          nextProgress
        )
      );

    const nextStatus: ProjectStatus =
      safeProgress === 100
        ? "Completed"
        : project.status ===
            "Completed"
          ? "Active"
          : project.status;

    saveProjects(
      projects.map(
        (item) =>
          item.id ===
          project.id
            ? {
                ...item,
                progress:
                  safeProgress,
                status:
                  nextStatus,
                updatedAt:
                  new Date().toISOString(),
              }
            : item
      )
    );
  }

  const filteredProjects =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return projects
        .filter(
          (project) => {
            if (
              filter ===
              "All"
            ) {
              return true;
            }

            return (
              project.status ===
              filter
            );
          }
        )
        .filter(
          (project) => {
            if (!query)
              return true;

            return (
              project.title
                .toLowerCase()
                .includes(
                  query
                ) ||
              project.description
                .toLowerCase()
                .includes(
                  query
                )
            );
          }
        )
        .sort(
          (a, b) =>
            new Date(
              b.updatedAt
            ).getTime() -
            new Date(
              a.updatedAt
            ).getTime()
        );
    }, [
      projects,
      search,
      filter,
    ]);

  const activeCount =
    projects.filter(
      (project) =>
        project.status ===
        "Active"
    ).length;

  const completedCount =
    projects.filter(
      (project) =>
        project.status ===
        "Completed"
    ).length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-[#746a5e]">
            Things you're building
          </p>

          <h3 className="mt-1 text-xl font-bold text-[#3f382f]">
            Projects
          </h3>
        </div>

        <button
          type="button"
          onClick={
            openNewProject
          }
          className="rounded-xl bg-[#8f806d] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#7d6f5e]"
        >
          + New Project
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-white/60 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-[#8a7e70]">
            Total
          </p>

          <p className="mt-1 text-2xl font-bold text-[#3f382f]">
            {projects.length}
          </p>

          <p className="mt-1 text-xs text-[#766c60]">
            projects
          </p>
        </div>

        <div className="rounded-2xl bg-white/60 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-[#8a7e70]">
            Active
          </p>

          <p className="mt-1 text-2xl font-bold text-[#3f382f]">
            {activeCount}
          </p>

          <p className="mt-1 text-xs text-[#766c60]">
            currently moving
          </p>
        </div>

        <div className="rounded-2xl bg-white/60 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-[#8a7e70]">
            Completed
          </p>

          <p className="mt-1 text-2xl font-bold text-[#3f382f]">
            {completedCount}
          </p>

          <p className="mt-1 text-xs text-[#766c60]">
            finished
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
          placeholder="Search projects..."
          className="min-w-0 flex-1 rounded-xl border border-[#cfc4b5] bg-[#f8f3eb] px-4 py-3 text-sm text-[#3f382f] outline-none placeholder:text-[#8c8276] focus:border-[#8f806d]"
        />

        <select
          value={filter}
          onChange={(event) =>
            setFilter(
              event.target
                .value as
                | "All"
                | ProjectStatus
            )
          }
          className="rounded-xl border border-[#cfc4b5] bg-[#f8f3eb] px-4 py-3 text-sm text-[#3f382f] outline-none focus:border-[#8f806d]"
        >
          <option value="All">
            All statuses
          </option>

          {STATUS_OPTIONS.map(
            (
              statusOption
            ) => (
              <option
                key={
                  statusOption
                }
                value={
                  statusOption
                }
              >
                {statusOption}
              </option>
            )
          )}
        </select>
      </div>

      {isEditorOpen && (
        <section className="mt-5 rounded-3xl border border-[#d7ccbd] bg-white/60 p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-[#8a7e70]">
                {editingId
                  ? "Edit project"
                  : "New project"}
              </p>

              <h4 className="mt-1 text-lg font-bold text-[#3f382f]">
                {editingId
                  ? "Update project"
                  : "Start something"}
              </h4>
            </div>

            <button
              type="button"
              onClick={
                closeEditor
              }
              className="rounded-lg px-3 py-2 text-sm text-[#746a5e] hover:bg-[#e5ddd2]"
            >
              Cancel
            </button>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label className="text-sm font-medium text-[#554c42]">
                Project name
              </label>

              <input
                type="text"
                value={title}
                onChange={(
                  event
                ) =>
                  setTitle(
                    event.target
                      .value
                  )
                }
                placeholder="e.g. Thesis, Life Game, personal site..."
                className="mt-2 w-full rounded-xl border border-[#cfc4b5] bg-[#f8f3eb] px-4 py-3 text-sm text-[#3f382f] outline-none placeholder:text-[#9a8f82] focus:border-[#8f806d]"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#554c42]">
                Description
              </label>

              <textarea
                value={
                  description
                }
                onChange={(
                  event
                ) =>
                  setDescription(
                    event.target
                      .value
                  )
                }
                rows={3}
                placeholder="What is this project about?"
                className="mt-2 w-full resize-y rounded-xl border border-[#cfc4b5] bg-[#f8f3eb] px-4 py-3 text-sm leading-6 text-[#3f382f] outline-none placeholder:text-[#9a8f82] focus:border-[#8f806d]"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-sm font-medium text-[#554c42]">
                  Status
                </label>

                <select
                  value={
                    status
                  }
                  onChange={(
                    event
                  ) =>
                    setStatus(
                      event.target
                        .value as ProjectStatus
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-[#cfc4b5] bg-[#f8f3eb] px-4 py-3 text-sm text-[#3f382f] outline-none focus:border-[#8f806d]"
                >
                  {STATUS_OPTIONS.map(
                    (
                      statusOption
                    ) => (
                      <option
                        key={
                          statusOption
                        }
                        value={
                          statusOption
                        }
                      >
                        {
                          statusOption
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-[#554c42]">
                  Progress
                </label>

                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={
                      status ===
                      "Completed"
                        ? 100
                        : progress
                    }
                    disabled={
                      status ===
                      "Completed"
                    }
                    onChange={(
                      event
                    ) =>
                      setProgress(
                        Number(
                          event
                            .target
                            .value
                        )
                      )
                    }
                    className="min-w-0 flex-1 accent-[#8f806d]"
                  />

                  <span className="w-12 text-right text-sm font-semibold text-[#554c42]">
                    {status ===
                    "Completed"
                      ? 100
                      : progress}
                    %
                  </span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-[#554c42]">
                  Target date
                </label>

                <input
                  type="date"
                  value={
                    targetDate
                  }
                  onChange={(
                    event
                  ) =>
                    setTargetDate(
                      event.target
                        .value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-[#cfc4b5] bg-[#f8f3eb] px-4 py-3 text-sm text-[#3f382f] outline-none focus:border-[#8f806d]"
                />
              </div>
            </div>

            <div className="flex justify-end border-t border-[#d8cec0] pt-4">
              <button
                type="button"
                onClick={
                  saveProject
                }
                disabled={
                  !title.trim()
                }
                className="rounded-xl bg-[#8f806d] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#7d6f5e] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {editingId
                  ? "Save Changes"
                  : "Create Project"}
              </button>
            </div>
          </div>
        </section>
      )}

      <div className="mt-5 space-y-3">
        {filteredProjects.length ===
        0 ? (
          <div className="rounded-3xl border border-[#d7ccbd] bg-[#f8f3eb]/70 p-8 text-center">
            <p className="text-4xl">
              🗂️
            </p>

            <p className="mt-3 font-semibold text-[#3f382f]">
              {search ||
              filter !==
                "All"
                ? "No projects found."
                : "No projects yet."}
            </p>

            <p className="mt-1 text-sm text-[#766c60]">
              {search ||
              filter !==
                "All"
                ? "Try another search or filter."
                : "Create your first project and start building."}
            </p>

            {!search &&
              filter ===
                "All" && (
                <button
                  type="button"
                  onClick={
                    openNewProject
                  }
                  className="mt-5 rounded-xl bg-[#8f806d] px-4 py-2 text-sm font-medium text-white"
                >
                  + New Project
                </button>
              )}
          </div>
        ) : (
          filteredProjects.map(
            (project) => (
              <article
                key={project.id}
                className="rounded-3xl border border-[#d7ccbd] bg-[#f8f3eb]/70 p-5 shadow-sm sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-lg font-bold text-[#3f382f]">
                        {
                          project.title
                        }
                      </h4>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                          project.status
                        )}`}
                      >
                        {
                          project.status
                        }
                      </span>
                    </div>

                    {project.description && (
                      <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-[#6d6358]">
                        {
                          project.description
                        }
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        openEditProject(
                          project
                        )
                      }
                      className="rounded-lg bg-[#ddd4c7] px-3 py-2 text-xs font-medium text-[#554c42] hover:bg-[#cfc3b4]"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        deleteProject(
                          project.id
                        )
                      }
                      className="rounded-lg px-3 py-2 text-xs font-medium text-[#8a5f55] hover:bg-[#eadbd5]"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between text-xs text-[#766c60]">
                    <span>
                      Progress
                    </span>

                    <span className="font-semibold text-[#554c42]">
                      {
                        project.progress
                      }
                      %
                    </span>
                  </div>

                  <div className="h-2.5 overflow-hidden rounded-full bg-[#ddd4c7]">
                    <div
                      className="h-full rounded-full bg-[#8f806d] transition-all"
                      style={{
                        width: `${project.progress}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#ded4c6] pt-4">
                  <div className="text-xs text-[#766c60]">
                    Target:{" "}
                    <span className="font-medium text-[#554c42]">
                      {formatDate(
                        project.targetDate
                      )}
                    </span>
                  </div>

                  {project.status !==
                    "Completed" && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateProgress(
                            project,
                            Math.max(
                              0,
                              project.progress -
                                10
                            )
                          )
                        }
                        className="rounded-lg bg-[#e4ddd2] px-2.5 py-1.5 text-xs text-[#554c42] hover:bg-[#d8cec0]"
                      >
                        −10%
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updateProgress(
                            project,
                            Math.min(
                              100,
                              project.progress +
                                10
                            )
                          )
                        }
                        className="rounded-lg bg-[#e4ddd2] px-2.5 py-1.5 text-xs text-[#554c42] hover:bg-[#d8cec0]"
                      >
                        +10%
                      </button>
                    </div>
                  )}
                </div>
              </article>
            )
          )
        )}
      </div>
    </div>
  );
}