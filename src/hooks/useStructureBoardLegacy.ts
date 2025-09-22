// path: src/hooks/useStructureBoardLegacy.ts
import { useStructureStore } from '@/store/structureStore';

/**
 * 既存のuseStructureBoardフックと同様のインターフェースを提供
 * 段階的移行のための互換レイヤー
 * 
 * 使用例:
 * - 既存のStructureBoardPaneでの暫定利用
 * - useStructureBoard → useStructureBoardLegacy への置き換え
 */
export function useStructureBoardLegacy() {
  const store = useStructureStore();
  
  return {
    // State（既存インターフェース維持）
    tasks: store.tasks,
    
    // Actions（既存メソッド名維持）
    updateTask: store.updateTask,
    getTask: store.getTask,
    getDependentTasks: store.getDependentTasks,
    markWorkedNow: store.markWorkedNow,
    
    // Utils（既存プロパティ名維持）
    taskCount: store.getTaskCount(),
  };
}

/**
 * StructureBoard拡張機能
 * 既存にない機能を段階的に追加
 */
export function useStructureBoardExtended() {
  const store = useStructureStore();
  
  return {
    // 基本機能（互換性）
    ...useStructureBoardLegacy(),
    
    // 拡張機能
    addTask: store.addTask,
    removeTask: store.removeTask,
    addHandoff: store.addHandoff,
    clearHandoffs: store.clearHandoffs,
    resetToDefaults: store.resetToDefaults,
    
    // Archive関連（基本情報のみ）
    isDirty: store.isDirty,
    lastSnapshotAt: store.lastSnapshotAt,
  };
}

/**
 * 段階的移行用のメタデータ
 */
export const MIGRATION_STATUS = {
  useStructureBoard: 'DEPRECATED', // 旧フック
  useStructureBoardLegacy: 'ACTIVE', // 現在の互換フック
  useStructureStore: 'PREFERRED', // 推奨の直接利用
} as const;