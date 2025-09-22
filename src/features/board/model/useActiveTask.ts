import { useState, useCallback } from 'react';
import { Task } from '@/types/structure';

/**
 * StructureBoard の選択タスク状態管理フック
 * アクティブなタスクの選択・解除・ジャンプ機能を提供
 */
export function useActiveTask() {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  /**
   * タスクを選択する
   * @param task - 選択するタスク
   */
  const selectTask = useCallback((task: Task) => {
    setActiveTask(task);
  }, []);

  /**
   * タスクIDでタスクを選択する
   * @param taskId - 選択するタスクID
   * @param tasks - タスクリスト（検索用）
   */
  const selectTaskById = useCallback((taskId: string, tasks: Task[]) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setActiveTask(task);
    }
  }, []);

  /**
   * 選択を解除する
   */
  const clearSelection = useCallback(() => {
    setActiveTask(null);
  }, []);

  /**
   * タスクにジャンプする（選択 + ビューモード変更対応）
   * @param taskId - ジャンプ先タスクID
   * @param tasks - タスクリスト（検索用）
   * @param setViewMode - ビューモード変更関数（オプション）
   */
  const jumpToTask = useCallback((
    taskId: string, 
    tasks: Task[], 
    setViewMode?: (mode: "kanban" | "tree" | "depgraph" | "architecture") => void
  ) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setActiveTask(task);
      // デフォルトでKanbanビューに切り替え（タスクが見つけやすいため）
      if (setViewMode) {
        setViewMode("kanban");
      }
    }
  }, []);

  /**
   * 現在選択されているタスクを新しいタスクデータで更新する
   * タスク更新時にアクティブタスクとの同期を保つため
   * @param updatedTask - 更新されたタスクデータ
   */
  const syncActiveTask = useCallback((updatedTask: Task) => {
    if (activeTask && activeTask.id === updatedTask.id) {
      setActiveTask(updatedTask);
    }
  }, [activeTask]);

  return {
    // State
    activeTask,
    activeTaskId: activeTask?.id ?? null,
    
    // Actions
    selectTask,
    selectTaskById,
    clearSelection,
    jumpToTask,
    syncActiveTask,
    
    // Computed
    hasSelection: activeTask !== null
  };
}