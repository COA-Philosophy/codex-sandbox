// path: src/store/structureStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MOCK_TASKS } from '@/types/structure';
import type { Task } from '@/types/structure';
import type { HandoffEntry, StructureSnapshot } from '@/types/archive';
import { tasksToStructureTasks, structureTasksToTasks } from '@/lib/structure-converter';
import { supabase } from '@/lib/supabase';

type StructureState = {
  tasks: Task[];
  handoffs: HandoffEntry[];
  lastSnapshotAt: number | null;
  isDirty: boolean;
};

type StructureActions = {
  // 基本タスク操作
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  getTask: (id: string) => Task | undefined;
  getDependentTasks: (taskId: string) => Task[];
  markWorkedNow: (id: string) => void;
  addTask: (task: Omit<Task, 'id'>) => Task;
  removeTask: (id: string) => void;
  
  // ハンドオフ管理
  addHandoff: (entry: Omit<HandoffEntry, 'id'>) => void;
  clearHandoffs: () => void;
  
  // Archive連携機能
  createSnapshot: () => StructureSnapshot;
  restoreFromSnapshot: (snapshot: StructureSnapshot) => void;
  markClean: () => void;
  
  // ユーティリティ
  resetToDefaults: () => void;
  getTaskCount: () => number;
};

const initialState: StructureState = {
  tasks: [...MOCK_TASKS],
  handoffs: [],
  lastSnapshotAt: null,
  isDirty: false,
};

export const useStructureStore = create<StructureState & StructureActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      updateTask: async (id, patch) => {
        // ローカル更新（即座にUI反映）
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
          isDirty: true,
        }));

        // Supabase更新（バックグラウンド）
        try {
          const updateData: any = {
            updated_at: new Date().toISOString(),
          };

          // Task型からDB型へのマッピング
          if (patch.title !== undefined) updateData.title = patch.title;
          if (patch.desc !== undefined) updateData.description = patch.desc; // Task.desc -> DB.description
          if (patch.phase !== undefined) updateData.phase = patch.phase;
          if (patch.owner !== undefined) updateData.owner = patch.owner;
          if (patch.tags !== undefined) updateData.tags = patch.tags;
          if (patch.priority !== undefined) updateData.priority = patch.priority;
          if (patch.status !== undefined) updateData.status = patch.status;
          if (patch.goal !== undefined) updateData.goal = patch.goal;
          if (patch.files_out !== undefined) updateData.files_out = patch.files_out;
          if (patch.deps !== undefined) updateData.deps = patch.deps;
          if (patch.estimatedHours !== undefined) updateData.estimated_hours = patch.estimatedHours;
          if (patch.actualHours !== undefined) updateData.actual_hours = patch.actualHours;
          if (patch.lastWorkedAt !== undefined) {
            updateData.last_worked_at = patch.lastWorkedAt ? new Date(patch.lastWorkedAt).toISOString() : null;
          }
          if (patch.lastWorkedBy !== undefined) updateData.last_worked_by = patch.lastWorkedBy;

          const { error } = await supabase
            .from('v2_project_tasks')
            .update(updateData)
            .eq('id', id);

          if (error) {
            console.error('[structureStore] Supabase update error:', error);
            // ローカル状態は保持、次回リロードで整合性チェック
          } else {
            console.debug('[structureStore] Task updated in Supabase:', id, updateData);
          }
        } catch (err) {
          console.error('[structureStore] Unexpected Supabase error:', err);
        }
      },

      getTask: (id) => {
        return get().tasks.find((t) => t.id === id);
      },

      getDependentTasks: (taskId) => {
        const task = get().getTask(taskId);
        if (!task) return [];
        
        return task.deps
          .map((depId) => get().getTask(depId))
          .filter((t): t is Task => t !== undefined);
      },

      markWorkedNow: (id) => {
        const task = get().getTask(id);
        if (!task) return;

        // 非同期updateTaskを呼び出し
        get().updateTask(id, {
          lastWorkedAt: Date.now(),
          lastWorkedBy: task.owner,
        }).catch((error) => {
          console.error('[structureStore] Failed to mark worked now:', error);
        });
      },

      addTask: (taskData) => {
        const newTask: Task = {
          ...taskData,
          id: `T-${String(Date.now()).slice(-6)}`,
        };
        
        set((state) => ({
          tasks: [...state.tasks, newTask],
          isDirty: true,
        }));
        
        return newTask;
      },

      removeTask: (id) => {
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
          handoffs: state.handoffs.filter((h) => h.taskId !== id),
          isDirty: true,
        }));
      },

      addHandoff: (entryData) => {
        const newEntry: HandoffEntry = {
          ...entryData,
          id: `H-${String(Date.now()).slice(-6)}`,
        };
        
        set((state) => ({
          handoffs: [...state.handoffs, newEntry],
          isDirty: true,
        }));
      },

      clearHandoffs: () => {
        set((state) => ({
          handoffs: [],
          isDirty: true,
        }));
      },

      createSnapshot: () => {
        const state = get();
        const snapshot: StructureSnapshot = {
          tasks: tasksToStructureTasks(state.tasks),
          handoffs: state.handoffs,
        };
        
        set({ lastSnapshotAt: Date.now() });
        return snapshot;
      },

      restoreFromSnapshot: (snapshot) => {
        try {
          const restoredTasks = structureTasksToTasks(snapshot.tasks);
          const restoredHandoffs = snapshot.handoffs || [];
          
          set({
            tasks: restoredTasks,
            handoffs: restoredHandoffs,
            lastSnapshotAt: Date.now(),
            isDirty: false,
          });
        } catch (error) {
          console.error('[structureStore] Failed to restore from snapshot:', error);
          throw new Error('Invalid snapshot format');
        }
      },

      markClean: () => {
        set({ isDirty: false });
      },

      resetToDefaults: () => {
        set({
          ...initialState,
          tasks: [...MOCK_TASKS],
        });
      },

      getTaskCount: () => {
        return get().tasks.length;
      },
    }),
   {
  name: 'structure-store',
  partialize: (state) => ({
    tasks: state.tasks,
    handoffs: state.handoffs,
    lastSnapshotAt: state.lastSnapshotAt,
  }),
  version: 1,
}
)
);