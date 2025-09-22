// path: src/features/board/ui/DetailPanel.tsx
import React, { useState } from "react";
import { Task, buildAiPrompt, buildHandoffSummary } from "@/types/structure";
import { copy } from "@/lib/utils";

interface DetailPanelProps {
  task: Task | null;
  tasks: Task[];
  onClose: () => void;
  onUpdateTask: (id: string, patch: Partial<Task>) => void;
  onJumpToTask: (id: string) => void;
}

/**
 * タスクの詳細情報を表示・編集するパネルコンポーネント
 */
export function DetailPanel({ 
  task, 
  tasks,
  onClose, 
  onUpdateTask,
  onJumpToTask 
}: DetailPanelProps) {
  // 編集状態管理
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");

  // タスク選択時に編集フォームを初期化
  React.useEffect(() => {
    if (task) {
      setEditTitle(task.title);
      setEditDesc(task.desc ?? "");
      setIsEditing(false);
    }
  }, [task?.id]); // task.idが変わった時のみ実行

  if (!task) {
    return (
      <div className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-4">
        <div className="text-sm opacity-70">Select a task to see details.</div>
      </div>
    );
  }

  const deps = task.deps.map(id => tasks.find(t => t.id === id)).filter(Boolean) as Task[];
  const aiPrompt = buildAiPrompt(task);
  const handoffSummary = buildHandoffSummary(task);

  const handleSaveEdit = () => {
    if (editTitle.trim() === "") {
      alert("Title cannot be empty");
      return;
    }

    onUpdateTask(task.id, {
      title: editTitle.trim(),
      desc: editDesc.trim() || undefined,
    });
    
    setIsEditing(false);
    console.debug('[DetailPanel] Task updated:', { id: task.id, title: editTitle, desc: editDesc });
  };

  const handleCancelEdit = () => {
    setEditTitle(task.title);
    setEditDesc(task.desc ?? "");
    setIsEditing(false);
  };

  return (
    <div className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-4 sticky top-4 self-start max-h-[80vh] overflow-auto">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-mono opacity-70">{task.id}</div>
          
          {/* タイトル編集UI */}
          {isEditing ? (
            <div className="mt-1">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1 text-sm font-semibold"
                placeholder="Task title..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit();
                  if (e.key === 'Escape') handleCancelEdit();
                }}
              />
            </div>
          ) : (
            <div 
              className="text-base font-semibold leading-tight cursor-pointer hover:text-blue-300 transition-colors"
              onClick={() => setIsEditing(true)}
              title="Click to edit title"
            >
              {task.title}
            </div>
          )}
          
          <div className="mt-1 text-xs opacity-70">
            Phase: <b>{task.phase}</b> · Owner: <b>{task.owner}</b>
          </div>
        </div>
        
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button 
                onClick={handleSaveEdit}
                className="px-2 py-1 text-xs rounded-lg bg-green-600 hover:bg-green-700 text-white"
              >
                Save
              </button>
              <button 
                onClick={handleCancelEdit}
                className="px-2 py-1 text-xs rounded-lg border border-neutral-700 hover:bg-neutral-800"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => setIsEditing(true)}
                className="px-2 py-1 text-xs rounded-lg border border-neutral-700 hover:bg-neutral-800"
              >
                Edit
              </button>
              <button 
                onClick={onClose} 
                className="px-2 py-1 text-xs rounded-lg border border-neutral-700 hover:bg-neutral-800"
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>

      {/* 説明編集UI */}
      <Section title="Description">
        {isEditing ? (
          <textarea 
            value={editDesc} 
            onChange={(e) => setEditDesc(e.target.value)}
            placeholder="Describe this task..."
            className="w-full h-20 rounded-xl bg-neutral-800 border border-neutral-700 p-2 text-sm resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Escape') handleCancelEdit();
            }}
          />
        ) : (
          <div 
            className="min-h-[2.5rem] p-2 rounded-xl border border-transparent hover:border-neutral-700 cursor-pointer transition-colors text-sm"
            onClick={() => setIsEditing(true)}
            title="Click to edit description"
          >
            {task.desc ? (
              <span className="opacity-90 leading-relaxed">{task.desc}</span>
            ) : (
              <span className="opacity-50 italic">Click to add description...</span>
            )}
          </div>
        )}
      </Section>

      <Section title="Tags">
        <div className="flex flex-wrap gap-1">
          {task.tags.map((tg) => (
            <span key={tg} className="text-xs px-1.5 py-0.5 rounded bg-neutral-800/80">
              #{tg}
            </span>
          ))}
          {task.tags.length === 0 && <span className="text-xs opacity-60">No tags</span>}
        </div>
      </Section>

      <Section title="files_out">
        <div className="space-y-1">
          {task.files_out.map((f) => (
            <div key={f} className="text-xs font-mono break-all">{f}</div>
          ))}
          {task.files_out.length === 0 && <span className="text-xs opacity-60">(none)</span>}
        </div>
      </Section>

      <Section title="deps">
        <div className="flex flex-wrap gap-1.5">
          {deps.map((d) => (
            <button 
              key={d.id} 
              onClick={() => onJumpToTask(d.id)}
              className="text-xs px-2 py-0.5 rounded-md border border-neutral-700 hover:bg-neutral-800 hover:border-neutral-600 transition"
            >
              {d.id}
            </button>
          ))}
          {deps.length === 0 && <span className="text-xs opacity-60">(none)</span>}
        </div>
      </Section>

      <Section title="Goal">
        <textarea 
          value={task.goal ?? ""} 
          onChange={(e) => onUpdateTask(task.id, { goal: e.target.value })}
          placeholder="What is the goal or intent of this task?"
          className="w-full h-20 rounded-xl bg-neutral-950 border border-neutral-800 p-2 text-xs resize-none"
        />
      </Section>

      <Section title="Handoff">
        <div className="text-xs opacity-80 mb-2">
          Last worked: <b>{task.lastWorkedAt ? new Date(task.lastWorkedAt).toLocaleString() : "(never)"}</b>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => onUpdateTask(task.id, { 
              lastWorkedAt: Date.now(), 
              lastWorkedBy: task.owner 
            })} 
            className="px-3 py-1.5 text-xs rounded-lg border border-neutral-700 hover:bg-neutral-800"
          >
            Mark Worked Now
          </button>
          <button 
            onClick={() => copy(handoffSummary)} 
            className="px-3 py-1.5 text-xs rounded-lg border border-neutral-700 hover:bg-neutral-800"
          >
            Copy Handoff Summary
          </button>
        </div>
      </Section>

      <Section title="AI Prompt">
        <textarea 
          readOnly 
          value={aiPrompt}
          className="w-full h-32 rounded-xl bg-neutral-950 border border-neutral-800 p-2 text-xs font-mono resize-none"
        />
        <div className="mt-2">
          <button 
            onClick={() => copy(aiPrompt)} 
            className="px-3 py-1.5 text-xs rounded-lg border border-neutral-700 hover:bg-neutral-800"
          >
            Copy AI Prompt
          </button>
        </div>
      </Section>
    </div>
  );
}

/**
 * セクションのヘッダーとコンテンツを表示するヘルパーコンポーネント
 */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <div className="text-xs uppercase tracking-wider opacity-60 mb-1">{title}</div>
      {children}
    </div>
  );
}