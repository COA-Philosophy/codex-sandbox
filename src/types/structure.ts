// path: src/types/structure.ts
export type Owner = "AI" | "HUMAN";

export type PhaseId = "INBOX" | "SPEC" | "BUILD" | "AUDIT" | "DONE";

export type Task = {
  id: string;
  title: string;
  phase: PhaseId;
  owner: Owner;
  tags: string[];
  files_out: string[];
  deps: string[];
  desc?: string;
  goal?: string;
  lastWorkedAt?: number;
  lastWorkedBy?: Owner | "MIXED";
  estimatedHours?: number;
  actualHours?: number;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status?: "TODO" | "IN_PROGRESS" | "BLOCKED" | "REVIEW" | "DONE";
};

export type Phase = {
  id: PhaseId;
  label: string;
  order: number;
  color: string;
};

export type HandoffSnapshot = {
  ts: number;
  view: "kanban" | "tree" | "depgraph" | "architecture";
  ownerFilter: Owner | "ALL";
  phaseFilter: PhaseId | "ALL";
  selectedTags: string[];
  activeTaskId: string | null;
  note?: string;
};

export type HandoffEntry = HandoffSnapshot & {
  id: string;
  actorRole: Owner;
  actorLabel?: string;
};

export const PHASES: Phase[] = [
  { id: "INBOX", label: "Inbox", order: 1, color: "bg-neutral-800" },
  { id: "SPEC", label: "Spec", order: 2, color: "bg-blue-900/40" },
  { id: "BUILD", label: "Build", order: 3, color: "bg-emerald-900/40" },
  { id: "AUDIT", label: "Audit", order: 4, color: "bg-purple-900/40" },
  { id: "DONE", label: "Done", order: 5, color: "bg-neutral-900/60" },
];

export const MOCK_TASKS: Task[] = [
  {
    id: "T-001",
    title: "Board Shell + Toolbar",
    phase: "INBOX",
    owner: "HUMAN",
    tags: ["ui", "scaffold"],
    files_out: ["app/structureboard/page.tsx", "src/features/board/ui/Board.tsx"],
    deps: [],
    desc: "Create base layout, toolbar, filters, and panels.",
  },
  {
    id: "T-002",
    title: "ViewMode Toggle",
    phase: "SPEC",
    owner: "AI",
    tags: ["ux", "state"],
    files_out: ["src/features/board/ui/ViewModeToggle.tsx"],
    deps: ["T-001"],
    desc: "Add Kanban / Tree / DepGraph / Architecture switches.",
  },
  {
    id: "T-003",
    title: "FileTree Overlay",
    phase: "BUILD",
    owner: "AI",
    tags: ["files", "overlay"],
    files_out: [
      "src/features/filetree/model/buildTree.ts",
      "src/features/filetree/ui/FileTreeOverlay.tsx",
    ],
    deps: ["T-002"],
    desc: "Show files_out hierarchy around selected task.",
  },
  {
    id: "T-004",
    title: "DepGraph SVG",
    phase: "BUILD",
    owner: "HUMAN",
    tags: ["graph", "svg"],
    files_out: ["src/features/graph/ui/DepGraphView.tsx"],
    deps: ["T-002"],
    desc: "Render simple DAG: phase on X, index on Y.",
  },
  {
    id: "T-005",
    title: "Architecture View",
    phase: "SPEC",
    owner: "HUMAN",
    tags: ["architecture", "diagram"],
    files_out: ["src/features/arch/ui/ArchitectureView.tsx"],
    deps: ["T-001"],
    desc: "Static system boxes + arrows: Session → Orchestrator → Board.",
  },
];

// Helper functions for AI prompts and handoff
export function buildAiPrompt(task: Task): string {
  return `You are a top-tier implementer. Implement the task below following StructureBoard conventions.

Task: ${task.id} — ${task.title}
Phase: ${task.phase}
Owner: ${task.owner}
Tags: ${task.tags.join(", ")}

Files to produce (files_out):
${task.files_out.map((f) => `- ${f}`).join("\n")}

Dependencies (deps): ${task.deps.join(", ") || "(none)"}

Notes:
${task.desc ?? "(none)"}

Goal:
${task.goal ?? "(not specified)"}`;
}

export function buildHandoffSummary(task: Task): string {
  return `Handoff Summary
ID: ${task.id}
Title: ${task.title}
Phase: ${task.phase}
Owner: ${task.owner}
Goal: ${task.goal ?? "(none)"}
Last worked: ${task.lastWorkedAt ? new Date(task.lastWorkedAt).toLocaleString() : "(never)"}
files_out:
${task.files_out.map((f) => `- ${f}`).join("\n")}
Deps: ${task.deps.join(", ") || "(none)"}`;
}