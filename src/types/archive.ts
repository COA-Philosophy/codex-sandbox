// path: src/types/archive.ts
export type PhaseId = 'INBOX' | 'SPEC' | 'BUILD' | 'AUDIT' | 'DONE';
export type Owner = 'AI' | 'HUMAN' | 'MIXED';

export type StructureTask = {
  id: string;                 // "T-001"など
  title: string;
  phase: PhaseId;
  owner: Owner;
  tags: string[];
  files_out: string[];
  deps: string[];             // 依存タスクID
  desc?: string;
  goal?: string;
  lastWorkedAt?: number;      // epoch ms
  lastWorkedBy?: Owner;
  estimatedHours?: number;
  actualHours?: number;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status?: "TODO" | "IN_PROGRESS" | "BLOCKED" | "REVIEW" | "DONE";
};

export type HandoffEntry = {
  id: string;                 // "H-001"など
  taskId: string;             // 紐づくタスクID
  from: Owner;
  to: Owner;
  at: number;                 // epoch ms
  note?: string;
  actorRole?: Owner;
  actorLabel?: string;
};

export type StructureSnapshot = {
  tasks: StructureTask[];
  handoffs: HandoffEntry[];
};

export type ProjectArchive = {
  id: string;
  user_id: string;
  title: string;
  structure_snapshot: StructureSnapshot; // JSONBに格納
  handoff_history: HandoffEntry[];       // 冗長保持（検索/可視化用）
  final_summary: string | null;

  task_count: number | null;
  completion_duration_hours: number | null;
  tags: string[] | null;

  started_at: string | null;   // ISO timestamp
  completed_at: string | null; // ISO timestamp
  environment: string;         // v2対応: 環境分離
  created_at?: string | null;
};

// Archive作成用の入力型
export type CreateArchiveInput = {
  title: string;
  structureSnapshot: StructureSnapshot;
  handoffHistory: HandoffEntry[];
  summary?: string;
  tags?: string[];
  startedAt?: string | null;
  completedAt?: string | null;
  completionDurationHours?: number | null;
};

// Archive更新用の入力型
export type UpdateArchiveInput = {
  title?: string;
  structureSnapshot?: StructureSnapshot;
  handoffHistory?: HandoffEntry[];
  summary?: string;
  tags?: string[];
  startedAt?: string | null;
  completedAt?: string | null;
  completionDurationHours?: number | null;
};

// ArchiveStore状態型
export type ArchiveState = {
  items: ProjectArchive[];
  selectedId: string | null;
  loading: boolean;
  error: string | null;
};

// Board復元用の型
export type BoardRestoreData = {
  snapshot: StructureSnapshot;
  metadata: {
    title: string;
    tags: string[];
    completedAt: string | null;
  };
};