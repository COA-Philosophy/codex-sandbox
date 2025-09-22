// path: src/features/board/ui/ArchiveControls.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useArchiveIntegration } from '@/hooks/useArchiveIntegration';
import { AlertCircle, Archive, Download, Upload, Loader2 } from 'lucide-react';
import type { ProjectArchive } from '@/types/archive';

interface ArchiveControlsProps {
  /** Boardに統合する場合のコンパクトモード */
  compact?: boolean;
  /** アーカイブ作成完了時のコールバック */
  onArchiveCreated?: (archive: ProjectArchive) => void;
  /** アーカイブ復元完了時のコールバック */
  onArchiveRestored?: (taskCount: number) => void;
}

export function ArchiveControls({ 
  compact = false, 
  onArchiveCreated,
  onArchiveRestored 
}: ArchiveControlsProps) {
  const {
    isOperating,
    operationType,
    operationProgress,
    archives,
    archiveLoading,
    archiveError,
    createArchive,
    restoreArchive,
    performEmergencyBackup,
    checkSyncStatus,
    refreshArchives,
    clearArchiveError
  } = useArchiveIntegration();

  const [customTitle, setCustomTitle] = useState('');
  const [showTitleInput, setShowTitleInput] = useState(false);
  const [syncStatus, setSyncStatus] = useState(checkSyncStatus());

  // Archive一覧の初期ロード
  useEffect(() => {
    refreshArchives();
  }, [refreshArchives]);

  // 同期状態の定期更新
  useEffect(() => {
    const interval = setInterval(() => {
      setSyncStatus(checkSyncStatus());
    }, 5000);
    return () => clearInterval(interval);
  }, [checkSyncStatus]);

  const handleCreateArchive = async () => {
    const title = showTitleInput && customTitle ? customTitle : undefined;
    const result = await createArchive(title);
    
    if (result.success && result.archive) {
      setCustomTitle('');
      setShowTitleInput(false);
      onArchiveCreated?.(result.archive);
    }
  };

  const handleRestoreArchive = async (archiveId: string) => {
    const result = await restoreArchive(archiveId);
    
    if (result.success && result.restoredTaskCount) {
      onArchiveRestored?.(result.restoredTaskCount);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2 bg-neutral-900 rounded-lg">
        <button
          onClick={handleCreateArchive}
          disabled={isOperating || syncStatus.boardTaskCount === 0}
          className="flex items-center gap-1 px-3 py-1 text-sm bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed rounded border border-neutral-700"
        >
          {isOperating && operationType === 'creating' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Archive className="h-4 w-4" />
          )}
          Archive
        </button>
        
        <button
          onClick={refreshArchives}
          disabled={archiveLoading}
          className="flex items-center gap-1 px-2 py-1 text-sm text-neutral-400 hover:text-neutral-200 disabled:opacity-50"
        >
          {archiveLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {archives.length}
        </button>

        {!syncStatus.isInSync && (
          <span className="px-2 py-1 text-xs bg-red-900 text-red-100 rounded">
            Unsaved
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg">
      <div className="p-4 border-b border-neutral-800">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Project Archives</h3>
          <div className="flex items-center gap-2">
            {syncStatus.isInSync ? (
              <span className="px-2 py-1 text-xs bg-green-900 text-green-100 rounded">
                Synced
              </span>
            ) : (
              <span className="px-2 py-1 text-xs bg-red-900 text-red-100 rounded">
                {syncStatus.issues.length} issues
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        {/* エラー表示 */}
        {archiveError && (
          <div className="flex items-center gap-2 p-2 bg-red-900/50 text-red-100 rounded-lg">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{archiveError}</span>
            <button 
              onClick={clearArchiveError} 
              className="ml-auto text-red-100 hover:text-red-50"
            >
              ✕
            </button>
          </div>
        )}

        {/* 操作進行状況 */}
        {isOperating && (
          <div className="flex items-center gap-2 p-2 bg-blue-900/50 text-blue-100 rounded-lg">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">{operationProgress}</span>
          </div>
        )}

        {/* アーカイブ作成 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTitleInput(!showTitleInput)}
              disabled={isOperating}
              className="px-3 py-1 text-sm bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 rounded border border-neutral-700"
            >
              Custom Title
            </button>
            
            <button
              onClick={handleCreateArchive}
              disabled={isOperating || syncStatus.boardTaskCount === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white"
            >
              <Archive className="h-4 w-4" />
              Create Archive ({syncStatus.boardTaskCount} tasks)
            </button>
          </div>
          
          {showTitleInput && (
            <input
              placeholder="Custom archive title..."
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-400 focus:outline-none focus:border-blue-500"
            />
          )}
        </div>

        {/* 緊急バックアップ */}
        <button
          onClick={performEmergencyBackup}
          disabled={isOperating || syncStatus.boardTaskCount === 0}
          className="flex items-center gap-2 w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white"
        >
          <Upload className="h-4 w-4" />
          Emergency Backup
        </button>

        {/* アーカイブ一覧 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-neutral-300">Saved Archives</h4>
            <button
              onClick={refreshArchives}
              disabled={archiveLoading}
              className="p-1 text-neutral-400 hover:text-neutral-200 disabled:opacity-50"
            >
              {archiveLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </button>
          </div>
          
          <div className="max-h-64 overflow-y-auto space-y-1">
            {archives.length === 0 ? (
              <p className="text-sm text-neutral-500 py-4 text-center">
                No archives yet
              </p>
            ) : (
              archives.map((archive) => (
                <div
                  key={archive.id}
                  className="flex items-center justify-between p-2 bg-neutral-800 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-100 truncate">
                      {archive.title}
                    </p>
                    <p className="text-xs text-neutral-400">
                      {archive.task_count} tasks • {
                        archive.completed_at 
                          ? new Date(archive.completed_at).toLocaleDateString()
                          : 'Unknown date'
                      }
                    </p>
                    {archive.tags && archive.tags.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {archive.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="px-2 py-1 text-xs bg-neutral-700 text-neutral-300 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handleRestoreArchive(archive.id)}
                    disabled={isOperating}
                    className="p-1 text-neutral-400 hover:text-neutral-200 disabled:opacity-50"
                  >
                    <Upload className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}