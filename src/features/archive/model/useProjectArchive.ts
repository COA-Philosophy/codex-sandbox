// path: src/features/archive/model/useProjectArchive.ts
import { useCallback, useEffect } from 'react';
import type { StructureSnapshot, BoardRestoreData } from '@/types/archive';
import { useArchiveStore } from '@/store/archiveStore';

export function useProjectArchive() {
  const store = useArchiveStore();

  // 初期化: 未ロード時にアーカイブ一覧を取得
  const init = useCallback(async () => {
    if (!store.items.length && !store.loading) {
      await store.loadList();
    }
  }, [store.items.length, store.loading, store.loadList]);

  // アプリ起動時に自動初期化
  useEffect(() => {
    init();
  }, [init]);

  // StructureBoardからのアーカイブ作成
  const createFromSnapshot = useCallback(async (
    title: string, 
    snapshot: StructureSnapshot, 
    opts?: {
      summary?: string; 
      tags?: string[]; 
      startedAt?: string | null; 
      completedAt?: string | null;
      completionDurationHours?: number | null;
    }
  ) => {
    return store.createFromSnapshot({ 
      title, 
      snapshot, 
      ...opts 
    });
  }, [store.createFromSnapshot]);

  // Board復元用のデータ取得
  const getRestoreData = useCallback(async (id: string): Promise<BoardRestoreData | null> => {
    const archive = await store.select(id);
    if (!archive) return null;

    return {
      snapshot: archive.structure_snapshot,
      metadata: {
        title: archive.title,
        tags: archive.tags ?? [],
        completedAt: archive.completed_at,
      },
    };
  }, [store.select]);

  // Board統合用の復元処理（B4フェーズで完全実装）
  const restoreToBoard = useCallback(async (id: string) => {
    const restoreData = await getRestoreData(id);
    if (!restoreData) return null;

    // TODO: B4フェーズでBoard Storeとの統合実装
    // - API /archives/[id]/restore を叩く or
    // - クライアントでスナップショットをBoardストアに流し込む
    console.log('Board restore準備完了:', { id, restoreData });
    
    return restoreData.snapshot;
  }, [getRestoreData]);

  // アーカイブ一覧の統計情報
  const getStatistics = useCallback(() => {
    const items = store.items;
    return {
      total: items.length,
      totalTasks: items.reduce((sum, item) => sum + (item.task_count ?? 0), 0),
      avgDuration: items.length > 0 
        ? items.reduce((sum, item) => sum + (item.completion_duration_hours ?? 0), 0) / items.length 
        : 0,
      recentCount: items.filter(item => {
        if (!item.completed_at) return false;
        const completedDate = new Date(item.completed_at);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return completedDate > weekAgo;
      }).length,
    };
  }, [store.items]);

  return {
    // State
    items: store.items,
    selectedId: store.selectedId,
    loading: store.loading,
    error: store.error,

    // Core Actions
    init,
    select: store.select,
    createFromSnapshot,
    rename: store.rename,
    remove: store.remove,
    updateMetadata: store.updateMetadata,

    // Board Integration
    getRestoreData,
    restoreToBoard,

    // Utilities
    getStatistics,
    clearError: store.clearError,
    reset: store.reset,
    
    // Auto-refresh
    refresh: store.loadList,
  };
}