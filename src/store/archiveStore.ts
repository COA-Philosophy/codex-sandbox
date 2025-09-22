// path: src/store/archiveStore.ts
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { ProjectArchive, StructureSnapshot } from '@/types/archive';

type ArchiveState = {
  items: ProjectArchive[];
  selectedId: string | null;
  loading: boolean;
  error: string | null;
};

type ArchiveActions = {
  loadList: () => Promise<void>;
  createFromSnapshot: (data: {
    title: string;
    snapshot: StructureSnapshot;
    summary?: string;                    // オプショナルに変更
    tags?: string[];                     // オプショナルに変更
    startedAt?: string | null;           // オプショナル + null許可
    completedAt?: string | null;         // オプショナル + null許可
    completionDurationHours?: number | null; // オプショナル + null許可
  }) => Promise<ProjectArchive>;
  select: (id: string) => Promise<ProjectArchive | null>;
  rename: (id: string, newTitle: string) => Promise<void>;        // 追加
  remove: (id: string) => Promise<void>;                          // 追加
  updateMetadata: (id: string, metadata: Partial<{               // 追加
    summary: string;
    tags: string[];
  }>) => Promise<void>;
  reset: () => void;                                              // 追加
  clearError: () => void;
};

export const useArchiveStore = create<ArchiveState & ArchiveActions>((set, get) => ({
  items: [],
  selectedId: null,
  loading: false,
  error: null,

  loadList: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('v2_project_archives')
        .select('*')
        .order('completed_at', { ascending: false });
      
      if (error) throw error;
      set({ items: data || [], loading: false });
    } catch (error) {
      console.error('[archiveStore] Load failed:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load archives',
        loading: false 
      });
    }
  },

  createFromSnapshot: async (data) => {
    set({ loading: true, error: null });
    try {
      // デフォルト値を提供してオプショナルパラメータを処理
      const archiveData = {
  title: data.title,
  structure_snapshot: data.snapshot,
  final_summary: data.summary ?? '',
  tags: data.tags ?? [],
  started_at: data.startedAt ?? null,
  completed_at: data.completedAt ?? null,
  completion_duration_hours: data.completionDurationHours ?? null,
 user_id: 'd587559e-f587-4d90-b471-e34d4e470aba', // 既存成功パターンと同じUUID
  environment: 'v2',
};
      console.log('[archiveStore] Creating archive without manual task_count:', {
  tasks_length: data.snapshot.tasks?.length,
  title: data.title
});

      const { data: result, error } = await supabase
        .from('v2_project_archives')
        .insert(archiveData)
        .select('*')
        .single();
      
      if (error) throw error;
      
      // リスト更新
      set(state => ({ 
        items: [result, ...state.items],
        loading: false 
      }));
      
      return result;
    } catch (error) {
      console.error('[archiveStore] Create failed:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create archive',
        loading: false 
      });
      throw error;
    }
  },

  select: async (id) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('v2_project_archives')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      set({ selectedId: id, loading: false });
      return data;
    } catch (error) {
      console.error('[archiveStore] Select failed:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to select archive',
        loading: false 
      });
      return null;
    }
  },

  // 新規追加: rename メソッド
  rename: async (id, newTitle) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('v2_project_archives')
        .update({ title: newTitle })
        .eq('id', id)
        .select('*')
        .single();
      
      if (error) throw error;
      
      // ローカル状態更新
      set(state => ({
        items: state.items.map(item => 
          item.id === id ? data : item
        ),
        loading: false
      }));
    } catch (error) {
      console.error('[archiveStore] Rename failed:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to rename archive',
        loading: false 
      });
    }
  },

  // 新規追加: remove メソッド
  remove: async (id) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('v2_project_archives')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // ローカル状態更新
      set(state => ({
        items: state.items.filter(item => item.id !== id),
        selectedId: state.selectedId === id ? null : state.selectedId,
        loading: false
      }));
    } catch (error) {
      console.error('[archiveStore] Remove failed:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to remove archive',
        loading: false 
      });
    }
  },

  // 新規追加: updateMetadata メソッド
  updateMetadata: async (id, metadata) => {
    set({ loading: true, error: null });
    try {
      const updateData: any = {};
      if (metadata.summary !== undefined) updateData.final_summary = metadata.summary;
      if (metadata.tags !== undefined) updateData.tags = metadata.tags;

      const { data, error } = await supabase
        .from('v2_project_archives')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();
      
      if (error) throw error;
      
      // ローカル状態更新
      set(state => ({
        items: state.items.map(item => 
          item.id === id ? data : item
        ),
        loading: false
      }));
    } catch (error) {
      console.error('[archiveStore] UpdateMetadata failed:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update metadata',
        loading: false 
      });
    }
  },

  // 新規追加: reset メソッド
  reset: () => {
    set({
      items: [],
      selectedId: null,
      loading: false,
      error: null
    });
  },

  clearError: () => set({ error: null })
}));