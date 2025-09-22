import React, { useMemo } from "react";
import { Task, PhaseId, PHASES } from "@/types/structure";

interface KanbanBoardProps {
  tasks: Task[];
  onSelect: (task: Task) => void;
  activeId: string | null;
}

/**
 * Kanban形式でタスクを5フェーズに分けて表示するコンポーネント
 */
export function KanbanBoard({ tasks, onSelect, activeId }: KanbanBoardProps) {
  const grouped = useMemo(() => {
    const g: Record<PhaseId, Task[]> = { INBOX: [], SPEC: [], BUILD: [], AUDIT: [], DONE: [] };
    for (const task of tasks) {
      g[task.phase].push(task);
    }
    return g;
  }, [tasks]);

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {PHASES.map((phase) => (
        <PhaseColumn
          key={phase.id}
          phase={phase}
          tasks={grouped[phase.id]}
          onSelect={onSelect}
          activeId={activeId}
        />
      ))}
    </div>
  );
}

/**
 * 単一フェーズのカラムコンポーネント
 */
function PhaseColumn({
  phase,
  tasks,
  onSelect,
  activeId
}: {
  phase: typeof PHASES[0];
  tasks: Task[];
  onSelect: (task: Task) => void;
  activeId: string | null;
}) {
  return (
    <div className={`rounded-3xl border border-neutral-800 ${phase.color}`}>
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="text-sm font-medium tracking-wide">{phase.label}</div>
        <div className="text-xs opacity-60">{tasks.length}</div>
      </div>
      <div className="px-3 pb-3 flex flex-col gap-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={() => onSelect(task)}
            active={activeId === task.id}
          />
        ))}
        {tasks.length === 0 && (
          <div className="text-xs opacity-50 px-3 py-6">No tasks</div>
        )}
      </div>
    </div>
  );
}

/**
 * 個別タスクを表示するカードコンポーネント
 */
function TaskCard({ 
  task, 
  onClick, 
  active 
}: { 
  task: Task; 
  onClick: () => void; 
  active: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-2xl border px-3 py-2 hover:border-neutral-600 transition ${
        active ? "border-neutral-500 bg-neutral-800" : "border-neutral-800 bg-neutral-900/60"
      }`}
    >
      {/* ヘッダー: ID + オーナーバッジ */}
      <div className="flex items-center justify-between">
        <div className="text-xs font-mono opacity-80">{task.id}</div>
        <span className={`text-xs px-1.5 py-0.5 rounded-md ${
          task.owner === "AI" ? "bg-indigo-900/50" : "bg-amber-900/40"
        }`}>
          {task.owner}
        </span>
      </div>
      
      {/* タイトル */}
      <div className="mt-1 text-sm font-medium leading-snug">{task.title}</div>
      
      {/* タグ表示 */}
      <div className="mt-1 flex flex-wrap gap-1">
        {task.tags.slice(0, 4).map((tag) => (
          <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-neutral-800/80">
            #{tag}
          </span>
        ))}
        {task.tags.length > 4 && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-neutral-700/60 opacity-70">
            +{task.tags.length - 4}
          </span>
        )}
      </div>
    </button>
  );
}