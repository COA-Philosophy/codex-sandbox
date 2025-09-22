import { useState, useCallback } from 'react';
import { Task, MOCK_TASKS } from '@/types/structure';

/**
 * StructureBoard のメイン状態管理フック
 * タスクデータとタスク操作機能を提供
 */
export function useStructureBoard() {
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);

  /**
   * タスクを更新する
   * @param id - 更新対象のタスクID
   * @param patch - 更新する項目のパッチオブジェクト
   */
  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
  }, []);

  /**
   * タスクを取得する
   * @param id - 取得したいタスクID
   * @returns 該当するタスクまたはundefined
   */
  const getTask = useCallback((id: string) => {
    return tasks.find(t => t.id === id);
  }, [tasks]);

  /**
   * 依存関係にあるタスクを取得する
   * @param taskId - 基準となるタスクID
   * @returns 依存関係にあるタスクの配列
   */
  const getDependentTasks = useCallback((taskId: string) => {
    const task = getTask(taskId);
    if (!task) return [];
    
    return task.deps
      .map(depId => getTask(depId))
      .filter((t): t is Task => t !== undefined);
  }, [getTask]);

  /**
   * タスクの作業時刻を現在時刻で更新する
   * @param id - 対象タスクID
   */
  const markWorkedNow = useCallback((id: string) => {
    const task = getTask(id);
    if (!task) return;

    updateTask(id, {
      lastWorkedAt: Date.now(),
      lastWorkedBy: task.owner
    });
  }, [getTask, updateTask]);

  return {
    // State
    tasks,
    
    // Actions
    updateTask,
    getTask,
    getDependentTasks,
    markWorkedNow,
    
    // Utils
    taskCount: tasks.length
  };
}