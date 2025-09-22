// path: src/hooks/useArchiveIntegration.ts
import { useState, useCallback } from 'react';
import { useArchiveStore } from '@/store/archiveStore';
import { useStructureStore } from '@/store/structureStore';
import { 
  createArchiveFromBoard, 
  restoreBoardFromArchive, 
  emergencyBackup,
  validateSyncStatus 
} from '@/features/board/logic/archiveIntegration';
import type { ProjectArchive } from '@/types/archive';

export function useArchiveIntegration() {
  const [operation, setOperation] = useState<{
    type: 'creating' | 'restoring' | 'backing-up' | null;
    progress: string;
  }>({ type: null, progress: '' });
  
  const archiveStore = useArchiveStore();
  const structureStore = useStructureStore();

  /**
   * 現在のBoardをArchiveとして保存
   */
  const createArchive = useCallback(async (customTitle?: string): Promise<{
    success: boolean;
    archive?: ProjectArchive;
    error?: string;
  }> => {
    setOperation({ type: 'creating', progress: 'Preparing archive...' });
    
    try {
      const createInput = createArchiveFromBoard();
      if (!createInput) {
        throw new Error('No data to archive');
      }
      
      if (customTitle) {
        createInput.title = customTitle;
      }
      
      setOperation({ type: 'creating', progress: 'Saving to database...' });
      const archive = await archiveStore.createFromSnapshot({
        title: createInput.title,
        snapshot: createInput.structureSnapshot,
        summary: createInput.summary,
        tags: createInput.tags,
        startedAt: createInput.startedAt,
        completedAt: createInput.completedAt,
        completionDurationHours: createInput.completionDurationHours
      });
      
      // Board状態をクリーンに
      setOperation({ type: 'creating', progress: 'Cleaning up...' });
      structureStore.markClean();
      
      setOperation({ type: null, progress: '' });
      return { success: true, archive };
    } catch (error) {
      setOperation({ type: null, progress: '' });
      const errorMessage = error instanceof Error ? error.message : 'Archive creation failed';
      console.error('[useArchiveIntegration] Create failed:', error);
      return { success: false, error: errorMessage };
    }
  }, []); // 依存配列を空に（structureStore, archiveStoreは安定参照）

  /**
   * ArchiveからBoardを復元
   */
  const restoreArchive = useCallback(async (archiveId: string): Promise<{
    success: boolean;
    restoredTaskCount?: number;
    error?: string;
  }> => {
    setOperation({ type: 'restoring', progress: 'Loading archive...' });
    
    try {
      const archive = await archiveStore.select(archiveId);
      if (!archive) {
        throw new Error('Archive not found');
      }
      
      setOperation({ type: 'restoring', progress: 'Restoring board state...' });
      const result = restoreBoardFromArchive(archive);
      
      if (!result.success) {
        throw new Error(result.error || 'Restoration failed');
      }
      
      setOperation({ type: null, progress: '' });
      return { 
        success: true, 
        restoredTaskCount: result.restoredTaskCount 
      };
    } catch (error) {
      setOperation({ type: null, progress: '' });
      const errorMessage = error instanceof Error ? error.message : 'Archive restoration failed';
      console.error('[useArchiveIntegration] Restore failed:', error);
      return { success: false, error: errorMessage };
    }
  }, []); // 依存配列を空に

  /**
   * 緊急バックアップ実行
   */
  const performEmergencyBackup = useCallback(async (): Promise<{
    success: boolean;
    archiveId?: string;
    error?: string;
  }> => {
    setOperation({ type: 'backing-up', progress: 'Creating emergency backup...' });
    
    try {
      const result = await emergencyBackup();
      setOperation({ type: null, progress: '' });
      return result;
    } catch (error) {
      setOperation({ type: null, progress: '' });
      const errorMessage = error instanceof Error ? error.message : 'Emergency backup failed';
      console.error('[useArchiveIntegration] Emergency backup failed:', error);
      return { success: false, error: errorMessage };
    }
  }, []);

  /**
   * 同期状態の確認
   */
  const checkSyncStatus = useCallback(() => {
    return validateSyncStatus();
  }, []);

  /**
   * Archive一覧の手動更新（自動更新削除）
   */
  const refreshArchives = useCallback(async () => {
    try {
      await archiveStore.loadList();
    } catch (error) {
      console.error('[useArchiveIntegration] Failed to refresh archives:', error);
    }
  }, []); // 依存配列を空に

  return {
    // 状態
    isOperating: operation.type !== null,
    operationType: operation.type,
    operationProgress: operation.progress,
    
    // Archive Store状態（直接参照、メモ化なし）
    archives: archiveStore.items,
    selectedArchiveId: archiveStore.selectedId,
    archiveLoading: archiveStore.loading,
    archiveError: archiveStore.error,
    
    // 操作
    createArchive,
    restoreArchive,
    performEmergencyBackup,
    checkSyncStatus,
    refreshArchives,
    
    // Archive Store操作（直接参照）
    clearArchiveError: archiveStore.clearError,
    selectArchive: archiveStore.select,
  };
}