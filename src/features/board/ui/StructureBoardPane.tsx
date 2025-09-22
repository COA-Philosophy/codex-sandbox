// path: src/features/board/ui/StructureBoardPane.tsx
"use client";

import React from "react";
import { supabase } from '@/lib/supabase';
import { Task, HandoffSnapshot } from "@/types/structure";
import { useTaskFilters } from "@/features/board/model/useTaskFilters";
import { useActiveTask } from "@/features/board/model/useActiveTask";
import { useViewMode, ViewMode } from "@/features/board/model/useViewMode";
import { useStructureStore } from "@/store/structureStore";
import { ArchiveControls } from "@/features/board/ui/ArchiveControls";

interface StructureBoardPaneProps {
  Header: React.ComponentType;
  HandoffBar: React.ComponentType<{
    activeTaskId: string | null;
    viewMode: ViewMode;
    ownerFilter: any;
    phaseFilter: any;
    selectedTags: string[];
    tasks: Task[];
    onApplySnapshot: (snapshot: HandoffSnapshot) => void;
  }>;
  Toolbar: React.ComponentType<any>;
  KanbanBoard: React.ComponentType<any>;
  TreeView: React.ComponentType<any>;
  DepGraphView: React.ComponentType<any>;
  ArchitecturePlaceholder: React.ComponentType;
  DetailPanel: React.ComponentType<any>;
}

export function StructureBoardPane({
  Header,
  HandoffBar,
  Toolbar,
  KanbanBoard,
  TreeView,
  DepGraphView,
  ArchitecturePlaceholder,
  DetailPanel
}: StructureBoardPaneProps) {
  // 統一されたストア使用（Legacy useStructureBoard削除）
  const structureStore = useStructureStore();
  
  // Store状態を直接使用
  const tasks = structureStore.tasks;
  const filterState = useTaskFilters(tasks);
  const activeState = useActiveTask();
  const viewState = useViewMode("kanban");

  // Archive統合テスト状態
  const [showArchivePanel, setShowArchivePanel] = React.useState(false);

  React.useEffect(() => {
  // ✅ SupabaseクライアントをConsoleから使えるように登録
  (async () => {
    const mod = await import('@/lib/supabase');
   (window as any).supabase = mod.supabase;
    console.log('✅ window.supabase 登録完了');
  })();
    
    
    // デバッグ関数（統一版）
    (window as any).debugStructureStore = () => {
      console.log('=== Unified Store State ===');
      console.log('Tasks count:', structureStore.getTaskCount());
      console.log('Tasks:', structureStore.tasks);
      console.log('isDirty:', structureStore.isDirty);
      console.log('handoffs:', structureStore.handoffs);
      console.log('lastSnapshotAt:', structureStore.lastSnapshotAt);
      console.log('=== Store Actions Available ===');
      console.log('- addTask, updateTask, removeTask');
      console.log('- createSnapshot, restoreFromSnapshot');
      console.log('- markClean, resetToDefaults');
    };

    // Archive統合テスト切り替え
    (window as any).showArchiveControls = () => {
      setShowArchivePanel(true);
      console.log('Archive controls panel opened');
    };

    (window as any).hideArchiveControls = () => {
      setShowArchivePanel(false);
      console.log('Archive controls panel closed');
    };

    // テストデータ生成（Store直接使用）
    (window as any).generateTestTasks = () => {
      const testTasks = [
        {
          title: 'Archive Test Task 1',
          phase: 'SPEC' as const,
          owner: 'HUMAN' as const,
          tags: ['test', 'archive'],
          files_out: ['test1.ts'],
          deps: [],
          priority: 'HIGH' as const,
          status: 'TODO' as const
        },
        {
          title: 'Archive Test Task 2',
          phase: 'BUILD' as const,
          owner: 'AI' as const,
          tags: ['test', 'implementation'],
          files_out: ['test2.ts'],
          deps: [],
          priority: 'MEDIUM' as const,
          status: 'IN_PROGRESS' as const
        },
        {
          title: 'Archive Test Task 3 (Done)',
          phase: 'DONE' as const,
          owner: 'HUMAN' as const,
          tags: ['test', 'completed'],
          files_out: ['test3.ts'],
          deps: [],
          priority: 'LOW' as const,
          status: 'DONE' as const,
          actualHours: 2.5
        }
      ];

      // 現在のタスクをクリアして新しいテストタスクを追加
      structureStore.resetToDefaults();
      testTasks.forEach(task => {
        structureStore.addTask(task);
      });
      
      console.log('Test tasks generated:', testTasks.length);
      console.log('Current task count:', structureStore.getTaskCount());
      alert(`Generated ${testTasks.length} test tasks for archive testing`);
    };

    // Archive実運用テスト
    (window as any).testArchiveFlow = async () => {
  console.log('🧪 Starting Archive Flow Test...');

  // 1. 現在の状態確認
  console.log('1. Current state check:');
  console.log(`- Tasks: ${structureStore.getTaskCount()}`);
  console.log(`- Dirty: ${structureStore.isDirty}`);

  if (structureStore.getTaskCount() === 0) {
    alert('⚠️ No tasks to archive. Generate test tasks first.');
    return;
  }

  // 2. スナップショット作成
  console.log('2. Creating snapshot...');
  let snapshot: ReturnType<typeof structureStore.createSnapshot>;
  try {
    snapshot = structureStore.createSnapshot();
    console.log('✅ Snapshot created:', snapshot);
    console.log(`- Tasks in snapshot: ${snapshot.tasks.length}`);
    console.log(`- Handoffs in snapshot: ${snapshot.handoffs.length}`);
  } catch (error) {
    console.error('❌ Snapshot creation failed:', error);
    alert('❌ Snapshot creation failed. Check console for details.');
    return;
  }

  // 3. Supabaseに保存（テスト用）
  try {
    const { data, error } = await supabase
      .from('v2_project_archives')
      .insert([
        {
          title: `Manual Archive - ${new Date().toISOString()}`,
          structure_snapshot: snapshot,
          user_id: 'd587559e-f587-4d90-b471-e34d4e470aba',
        },
      ]);

    if (error) {
      console.error('❌ Insert failed:', error);
      alert('❌ Archive insert failed');
    } else {
      console.log('✅ Insert success:', data);
      alert('✅ Archive saved to Supabase!');
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    alert('❌ Unexpected error during insert.');
  }
};

    // Phase B-5 テスト関数追加
    (window as any).testSupabaseTaskUpdate = async () => {
      console.log('🧪 Testing Supabase Task Update...');
      
      const testTask = structureStore.tasks[0];
      if (!testTask) {
        alert('⚠️ No tasks available for testing');
        return;
      }

      console.log('Original task:', testTask);
      
      try {
        await structureStore.updateTask(testTask.id, {
          title: `Updated: ${testTask.title} (${new Date().toLocaleTimeString()})`,
          desc: `Test description updated at ${new Date().toISOString()}`
        });
        
        console.log('✅ Task update completed');
        alert('✅ Task updated! Check Supabase database and local state.');
      } catch (error) {
        console.error('❌ Task update failed:', error);
        alert('❌ Task update failed. Check console for details.');
      }
    };

    console.log('🎯 Unified Store Archive Integration Commands:');
    console.log('- window.generateTestTasks() - テストタスク生成');
    console.log('- window.showArchiveControls() - Archiveパネル表示');
    console.log('- window.testArchiveFlow() - Archive実運用テスト');
    console.log('- window.testSupabaseTaskUpdate() - Supabaseタスク更新テスト');
    console.log('- window.debugStructureStore() - Store状態確認');

    setTimeout(() => {
      (window as any).debugStructureStore();
    }, 1000);

    return () => {
      delete (window as any).debugStructureStore;
      delete (window as any).showArchiveControls;
      delete (window as any).hideArchiveControls;
      delete (window as any).generateTestTasks;
      delete (window as any).testArchiveFlow;
      delete (window as any).testSupabaseTaskUpdate;
    };
  }, [structureStore]);

  // Store統一版のタスク操作（非同期対応）
  const handleUpdateTask = async (id: string, patch: Partial<Task>) => {
    try {
      await structureStore.updateTask(id, patch);
      structureStore.markWorkedNow(id);
      
      if (activeState.activeTaskId === id) {
        const updatedTask = structureStore.getTask(id);
        if (updatedTask) {
          activeState.syncActiveTask(updatedTask);
        }
      }
    } catch (error) {
      console.error('[StructureBoardPane] Failed to update task:', error);
    }
  };

  const handleJumpToTask = (taskId: string) => {
    activeState.jumpToTask(taskId, tasks, viewState.setViewMode);
  };

  const handleApplySnapshot = (snapshot: HandoffSnapshot) => {
    viewState.setViewMode(snapshot.view);
    filterState.setOwnerFilter(snapshot.ownerFilter);
    filterState.setPhaseFilter(snapshot.phaseFilter);
    filterState.setSelectedTags(snapshot.selectedTags);
    
    if (snapshot.activeTaskId) {
      const task = tasks.find(t => t.id === snapshot.activeTaskId);
      if (task) {
        activeState.selectTask(task);
      }
    } else {
      activeState.clearSelection();
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-7xl px-5 py-6">
        <Header />
        
        {/* Archive統合テストパネル（改良版） */}
        {showArchivePanel && (
          <div className="mb-4 p-4 bg-blue-900/20 border border-blue-600 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-blue-200">Archive Integration Test - Unified Store</h3>
              <button
                onClick={() => setShowArchivePanel(false)}
                className="text-blue-200 hover:text-blue-100 text-xl"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Archive Controls */}
              <div>
                <h4 className="text-sm font-medium text-blue-300 mb-2">Archive Operations</h4>
                <ArchiveControls
                  compact={true}
                  onArchiveCreated={(archive) => {
                    console.log('[Board] Archive created:', archive.title);
                    alert(`✅ Archive created: ${archive.title}`);
                    // Store状態確認
                    setTimeout(() => (window as any).debugStructureStore(), 500);
                  }}
                  onArchiveRestored={(taskCount) => {
                    console.log('[Board] Archive restored:', taskCount);
                    alert(`✅ Archive restored: ${taskCount} tasks`);
                    // Store状態確認
                    setTimeout(() => (window as any).debugStructureStore(), 500);
                  }}
                />
              </div>
              
              {/* 統計情報（Store直接表示） */}
              <div className="space-y-2 text-sm">
                <div className="text-blue-300 font-medium">Unified Store Status:</div>
                <div>Tasks: {structureStore.tasks.length}</div>
                <div>Dirty: {structureStore.isDirty ? 'Yes' : 'No'}</div>
                <div>Handoffs: {structureStore.handoffs.length}</div>
                <div>
                  Last Snapshot: {
                    structureStore.lastSnapshotAt 
                      ? new Date(structureStore.lastSnapshotAt).toLocaleTimeString()
                      : 'None'
                  }
                </div>
                
                <div className="mt-3 space-y-1">
                  <button
                    onClick={() => (window as any).generateTestTasks()}
                    className="block w-full px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-white text-sm"
                  >
                    Generate Test Tasks
                  </button>
                  <button
                    onClick={() => (window as any).testArchiveFlow()}
                    className="block w-full px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-white text-sm"
                  >
                    Test Archive Flow
                  </button>
                  <button
                    onClick={() => (window as any).testSupabaseTaskUpdate()}
                    className="block w-full px-3 py-1 bg-orange-600 hover:bg-orange-700 rounded text-white text-sm"
                  >
                    Test Task Update
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <HandoffBar 
          activeTaskId={activeState.activeTaskId}
          viewMode={viewState.viewMode}
          ownerFilter={filterState.ownerFilter}
          phaseFilter={filterState.phaseFilter}
          selectedTags={filterState.selectedTags}
          tasks={tasks}
          onApplySnapshot={handleApplySnapshot}
        />
        
        <Toolbar
          q={filterState.query}
          setQ={filterState.setQuery}
          ownerFilter={filterState.ownerFilter}
          setOwnerFilter={filterState.setOwnerFilter}
          phaseFilter={filterState.phaseFilter}
          setPhaseFilter={filterState.setPhaseFilter}
          tagUniverse={filterState.tagUniverse}
          selectedTags={filterState.selectedTags}
          toggleTag={filterState.toggleTag}
          view={viewState.viewMode}
          setView={viewState.setViewMode}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 mt-4">
          <div>
            {viewState.viewMode === "kanban" && (
              <KanbanBoard 
                tasks={filterState.filteredTasks}
                onSelect={activeState.selectTask}
                activeId={activeState.activeTaskId}
              />
            )}
            
            {viewState.viewMode === "tree" && (
              <TreeView 
                tasks={filterState.filteredTasks}
                activeTask={activeState.activeTask}
                onSelectTask={activeState.selectTask}
              />
            )}
            
            {viewState.viewMode === "depgraph" && (
              <DepGraphView 
                tasks={filterState.filteredTasks}
                onSelect={activeState.selectTask}
                activeId={activeState.activeTaskId}
              />
            )}
            
            {viewState.viewMode === "architecture" && (
              <ArchitecturePlaceholder />
            )}
          </div>

          <DetailPanel 
            task={activeState.activeTask}
            tasks={tasks}
            onClose={activeState.clearSelection}
            onUpdateTask={handleUpdateTask}
            onJumpToTask={handleJumpToTask}
          />
        </div>
      </div>
    </div>
  );
}