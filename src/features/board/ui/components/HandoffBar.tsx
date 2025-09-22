// path: src/features/board/ui/components/HandoffBar.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useLocalStorage, useLocalStorageArray } from '@/hooks/useLocalStorage';
import { HandoffSnapshot, HandoffEntry, Task, Owner, PhaseId, PHASES } from '@/types/structure';
import { formatTimestamp } from '@/lib/utils';
import { ViewMode } from '@/features/board/model/useViewMode';

interface HandoffBarProps {
  activeTaskId: string | null;
  viewMode: ViewMode;
  ownerFilter: Owner | "ALL";
  phaseFilter: PhaseId | "ALL";
  selectedTags: string[];
  tasks: Task[];
  onApplySnapshot: (snapshot: HandoffSnapshot) => void;
}

const SNAPSHOT_KEY = 'SB_HANDOFF_SNAPSHOT_v1';
const HISTORY_KEY = 'SB_HANDOFF_HISTORY_v1';
const MAX_HISTORY = 50;

/**
 * ハンドオフ（作業引き継ぎ）管理バーコンポーネント
 * クライアントサイド専用でHydrationエラーを回避
 */
export function HandoffBar({
  activeTaskId,
  viewMode,
  ownerFilter,
  phaseFilter,
  selectedTags,
  tasks,
  onApplySnapshot
}: HandoffBarProps) {
  // クライアントサイドマウント状態
  const [isMounted, setIsMounted] = useState(false);
  
  // ローカルストレージフック（クライアントサイドのみ）
  const [snapshot, setSnapshot] = useLocalStorage<HandoffSnapshot | null>(SNAPSHOT_KEY, null);
  const { items: history, pushItem: pushHistory, setItems: setHistory } = useLocalStorageArray<HandoffEntry>(HISTORY_KEY);
  
  const [handoffNote, setHandoffNote] = useState('');
  const [actor, setActor] = useState<Owner>('HUMAN');
  const [model, setModel] = useState('');

  // クライアントサイドマウント検知
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // サーバーサイド/初期レンダリング時は基本構造のみ表示
  if (!isMounted) {
    return (
      <Card className="mt-3 border-neutral-800 bg-neutral-900/40">
        <div className="p-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="text-xs opacity-80">
              <div>Last handoff: <b>(loading...)</b></div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>Apply</Button>
              <Button variant="outline" size="sm" disabled>Save</Button>
            </div>
          </div>
          
          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]">
            <div>
              <textarea
                placeholder="Handoff note (what we did, what's next, risks)"
                className="w-full h-16 rounded-xl bg-neutral-950 border border-neutral-800 p-2 text-xs resize-none"
                disabled
              />
            </div>
            
            <div className="flex items-start gap-2">
              <select 
                className="rounded-xl bg-neutral-950 border border-neutral-800 px-2 py-2 text-xs"
                disabled
              >
                <option>HUMAN</option>
              </select>
              
              <input 
                placeholder="Model/Name (e.g. gpt-5, Claude, alice)"
                className="w-[240px] rounded-xl bg-neutral-950 border border-neutral-800 px-2 py-2 text-xs"
                disabled
              />
              
              <Button variant="outline" size="sm" disabled>
                Export JSON
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // 以下はクライアントサイドのみの処理
  const activeTask = activeTaskId ? tasks.find(t => t.id === activeTaskId) || null : null;
  const phaseLabel = activeTask ? PHASES.find(p => p.id === activeTask.phase)?.label : undefined;

  // スナップショット保存
  const saveSnapshot = () => {
    const newSnapshot: HandoffSnapshot = {
      ts: Date.now(),
      view: viewMode,
      ownerFilter,
      phaseFilter,
      selectedTags,
      activeTaskId,
      note: handoffNote
    };

    setSnapshot(newSnapshot);

    const historyEntry: HandoffEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      actorRole: actor,
      actorLabel: model || undefined,
      ...newSnapshot
    };

    pushHistory(historyEntry);
    
    if (history.length >= MAX_HISTORY) {
      setHistory(prev => [historyEntry, ...prev.slice(0, MAX_HISTORY - 1)]);
    }
  };

  // スナップショット適用
  const applySnapshot = (snapshotToApply?: HandoffSnapshot) => {
    const targetSnapshot = snapshotToApply || snapshot;
    if (!targetSnapshot) return;

    onApplySnapshot(targetSnapshot);
    setHandoffNote(targetSnapshot.note || '');
  };

  // 履歴からの適用
  const applyFromHistory = (entry: HandoffEntry) => {
    setSnapshot(entry);
    applySnapshot(entry);
  };

  // JSONエクスポート
  const exportHistory = () => {
    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      entries: history
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `handoff-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="mt-3 border-neutral-800 bg-neutral-900/40">
      <div className="p-3">
        {/* 上段: スナップショット情報とボタン */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="text-xs opacity-80">
            <div>
              Last handoff: <b>{snapshot ? formatTimestamp(snapshot.ts) : "(none)"}</b>
              {activeTask && (
                <>
                  {" · "}
                  <span className="opacity-80">{activeTask.id}</span>
                  {phaseLabel && <span className="opacity-70"> ({phaseLabel})</span>}
                </>
              )}
            </div>
            {snapshot?.note && (
              <div className="opacity-70 mt-0.5">Note: {snapshot.note}</div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => applySnapshot()}
              disabled={!snapshot}
            >
              Apply
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={saveSnapshot}
            >
              Save
            </Button>
          </div>
        </div>

        {/* 中段: ハンドオフノートとメタ情報 */}
        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]">
          <div>
            <textarea
              value={handoffNote}
              onChange={(e) => setHandoffNote(e.target.value)}
              placeholder="Handoff note (what we did, what's next, risks)"
              className="w-full h-16 rounded-xl bg-neutral-950 border border-neutral-800 p-2 text-xs resize-none"
            />
          </div>
          
          <div className="flex items-start gap-2">
            <select 
              value={actor} 
              onChange={(e) => setActor(e.target.value as Owner)}
              className="rounded-xl bg-neutral-950 border border-neutral-800 px-2 py-2 text-xs"
              title="Actor"
            >
              <option value="HUMAN">HUMAN</option>
              <option value="AI">AI</option>
            </select>
            
            <input 
              value={model} 
              onChange={(e) => setModel(e.target.value)}
              placeholder="Model/Name (e.g. gpt-5, Claude, alice)"
              className="w-[240px] rounded-xl bg-neutral-950 border border-neutral-800 px-2 py-2 text-xs"
            />
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportHistory}
              disabled={history.length === 0}
            >
              Export JSON
            </Button>
          </div>
        </div>

        {/* 下段: 履歴表示 */}
        {history.length > 0 && (
          <div className="mt-2 border-t border-neutral-800 pt-2">
            <div className="text-[11px] opacity-70 mb-1">History (latest first)</div>
            <div className="flex flex-col gap-1 max-h-36 overflow-auto">
              {history.slice(0, 10).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between text-xs">
                  <div className="truncate mr-2">
                    <span className="opacity-70">{formatTimestamp(entry.ts)}</span>
                    {" · "}
                    <span>{entry.actorRole}{entry.actorLabel ? `:${entry.actorLabel}` : ''}</span>
                    {entry.activeTaskId && (
                      <span className="opacity-60"> · {entry.activeTaskId}</span>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => applyFromHistory(entry)}
                    className="px-2 py-0.5 h-auto text-xs"
                  >
                    Apply
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}