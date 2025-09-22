import React from "react";
import { PHASES, Owner, PhaseId } from "@/types/structure";
import { ViewMode } from "@/features/board/model/useViewMode";

interface ToolbarProps {
  // 検索フィルター
  q: string;
  setQ: (value: string) => void;
  
  // オーナーフィルター
  ownerFilter: Owner | "ALL";
  setOwnerFilter: (owner: Owner | "ALL") => void;
  
  // フェーズフィルター
  phaseFilter: PhaseId | "ALL";
  setPhaseFilter: (phase: PhaseId | "ALL") => void;
  
  // タグフィルター
  tagUniverse: string[];
  selectedTags: string[];
  toggleTag: (tag: string) => void;
  
  // ビューモード
  view: ViewMode;
  setView: (view: ViewMode) => void;
}

/**
 * 検索・フィルター・ビュー切り替えを統合したツールバーコンポーネント
 */
export function Toolbar({
  q, setQ, ownerFilter, setOwnerFilter, phaseFilter, setPhaseFilter,
  tagUniverse, selectedTags, toggleTag, view, setView
}: ToolbarProps) {
  return (
    <div className="rounded-3xl border border-neutral-800 bg-neutral-900/50 px-4 py-3 mt-3">
      {/* 上段: 検索・フィルター・ビュー切り替え */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* 左側: 検索・フィルター */}
        <div className="flex items-center gap-2">
          <SearchInput value={q} onChange={setQ} />
          <OwnerFilter value={ownerFilter} onChange={setOwnerFilter} />
          <PhaseFilter value={phaseFilter} onChange={setPhaseFilter} />
        </div>

        {/* 右側: ビュー切り替えボタン */}
        <div className="flex items-center gap-2">
          <ViewButton view="kanban" label="Kanban" currentView={view} onViewChange={setView} />
          <ViewButton view="tree" label="Tree" currentView={view} onViewChange={setView} />
          <ViewButton view="depgraph" label="DepGraph" currentView={view} onViewChange={setView} />
          <ViewButton view="architecture" label="Architecture" currentView={view} onViewChange={setView} />
        </div>
      </div>

      {/* 下段: タグフィルター */}
      <TagFilter
        tagUniverse={tagUniverse}
        selectedTags={selectedTags}
        onToggleTag={toggleTag}
      />
    </div>
  );
}

/**
 * 検索入力コンポーネント
 */
function SearchInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Search (AND match: space-separated)"
      className="w-80 rounded-xl bg-neutral-950 border border-neutral-800 px-3 py-2 text-sm outline-none focus:border-neutral-600"
    />
  );
}

/**
 * オーナーフィルターコンポーネント
 */
function OwnerFilter({ 
  value, 
  onChange 
}: { 
  value: Owner | "ALL"; 
  onChange: (owner: Owner | "ALL") => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Owner | "ALL")}
      className="rounded-xl bg-neutral-950 border border-neutral-800 px-2 py-2 text-sm"
    >
      <option value="ALL">Owner: All</option>
      <option value="HUMAN">Owner: Human</option>
      <option value="AI">Owner: AI</option>
    </select>
  );
}

/**
 * フェーズフィルターコンポーネント
 */
function PhaseFilter({ 
  value, 
  onChange 
}: { 
  value: PhaseId | "ALL"; 
  onChange: (phase: PhaseId | "ALL") => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as PhaseId | "ALL")}
      className="rounded-xl bg-neutral-950 border border-neutral-800 px-2 py-2 text-sm"
    >
      <option value="ALL">Phase: All</option>
      {PHASES.map((phase) => (
        <option key={phase.id} value={phase.id}>
          {phase.label}
        </option>
      ))}
    </select>
  );
}

/**
 * ビュー切り替えボタンコンポーネント
 */
function ViewButton({ 
  view, 
  label, 
  currentView, 
  onViewChange 
}: { 
  view: ViewMode; 
  label: string; 
  currentView: ViewMode; 
  onViewChange: (view: ViewMode) => void;
}) {
  return (
    <button
      onClick={() => onViewChange(view)}
      className={`px-3 py-1.5 text-sm rounded-xl border border-neutral-800 ${
        currentView === view ? "bg-neutral-800" : "hover:bg-neutral-800/60"
      }`}
    >
      {label}
    </button>
  );
}

/**
 * タグフィルターコンポーネント
 */
function TagFilter({ 
  tagUniverse, 
  selectedTags, 
  onToggleTag 
}: { 
  tagUniverse: string[]; 
  selectedTags: string[]; 
  onToggleTag: (tag: string) => void;
}) {
  if (tagUniverse.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {tagUniverse.map((tag) => (
        <button
          key={tag}
          onClick={() => onToggleTag(tag)}
          className={`px-2 py-1 text-xs rounded-lg border ${
            selectedTags.includes(tag) 
              ? "border-neutral-500 bg-neutral-800" 
              : "border-neutral-800 bg-neutral-950 hover:bg-neutral-900"
          }`}
        >
          #{tag}
        </button>
      ))}
    </div>
  );
}