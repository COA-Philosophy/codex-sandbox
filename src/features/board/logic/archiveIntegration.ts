// path: src/features/board/logic/archiveIntegration.ts
import { useStructureStore } from '@/store/structureStore';
import { useArchiveStore } from '@/store/archiveStore';
import type { StructureSnapshot, ProjectArchive } from '@/types/archive';
import type { Task } from '@/types/structure';

/**
 * 現在のBoardからArchive作成用データを生成
 */
export function createArchiveFromBoard() {
  const store = useStructureStore.getState();
  
  if (store.tasks.length === 0) {
    return null;
  }

  // 基本統計計算
  const completedTasks = store.tasks.filter(t => t.phase === 'DONE');
  const inProgressTasks = store.tasks.filter(t => t.phase !== 'DONE' && t.phase !== 'INBOX');
  
  // 作業時間計算（INTEGER型安全変換）
  const totalActualHours = store.tasks
    .map(t => t.actualHours || 0)
    .reduce((sum, hours) => sum + hours, 0);
  
  // INTEGER型に安全変換（小数点切り上げ）
  const completionDurationHours = Math.ceil(totalActualHours);

  // プロジェクト期間計算（ISO文字列に変換）
  const timestamps = store.tasks
    .map(t => t.lastWorkedAt)
    .filter((t): t is number => t !== undefined);
  
  const startedAtTimestamp = timestamps.length > 0 ? Math.min(...timestamps) : Date.now();
  const completedAtTimestamp = Date.now();

  // ISO文字列に変換（PostgreSQL TIMESTAMPTZ対応）
  const startedAt = new Date(startedAtTimestamp).toISOString();
  const completedAt = new Date(completedAtTimestamp).toISOString();

  // タイトル生成
  const title = generateProjectTitle(store.tasks);
  
  // サマリー生成
  const summary = generateProjectSummary(store.tasks, {
    totalTasks: store.tasks.length,
    completedTasks: completedTasks.length,
    inProgressTasks: inProgressTasks.length,
    completionDurationHours
  });

  // タグ生成（配列確実保証）
  const tags = generateTags(store.tasks);

  // Structure Snapshot作成（PostgreSQL Generated Column対応）
  const structureTasks = tasksToStructureTasks(store.tasks);
  
  // 各タスクの配列フィールドを確実に配列にする
  const sanitizedTasks = structureTasks.map(task => ({
    ...task,
    tags: Array.isArray(task.tags) ? task.tags : [],
    files_out: Array.isArray(task.files_out) ? task.files_out : [],
    deps: Array.isArray(task.deps) ? task.deps : []
  }));

  const structureSnapshot: StructureSnapshot = {
    tasks: sanitizedTasks,
    handoffs: store.handoffs || []
  };

  console.log('[archiveIntegration] Creating archive with data:', {
    title,
    tasksCount: sanitizedTasks.length,
    handsoffsCount: structureSnapshot.handoffs.length,
    tagsCount: tags.length,
    completionDurationHours,
    startedAt,
    completedAt
  });

  return {
    title,
    summary,
    tags,
    structureSnapshot,
    startedAt,      // ISO文字列
    completedAt,    // ISO文字列
    completionDurationHours, // INTEGER
  };
}

/**
 * ArchiveからBoard状態を復元
 */
export function restoreBoardFromArchive(archive: ProjectArchive): {
  success: boolean;
  restoredTaskCount?: number;
  error?: string;
} {
  try {
    const store = useStructureStore.getState();
    
    if (!archive.structure_snapshot?.tasks) {
      return { success: false, error: 'Invalid archive: missing task data' };
    }

    // 型変換してBoard形式に復元
    const restoredTasks = structureTasksToTasks(archive.structure_snapshot.tasks);
    const restoredHandoffs = archive.structure_snapshot.handoffs || [];

    // Store状態を復元
    const structureSnapshot: StructureSnapshot = {
      tasks: restoredTasks,
      handoffs: restoredHandoffs,
    };

    store.restoreFromSnapshot(structureSnapshot);
    
    return { 
      success: true, 
      restoredTaskCount: restoredTasks.length 
    };
  } catch (error) {
    console.error('[archiveIntegration] Restore failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown restoration error' 
    };
  }
}

/**
 * 緊急バックアップ実行
 */
export async function emergencyBackup(): Promise<{
  success: boolean;
  archiveId?: string;
  error?: string;
}> {
  try {
    const createData = createArchiveFromBoard();
    if (!createData) {
      return { success: false, error: 'No data to backup' };
    }

    const archiveStore = useArchiveStore.getState();
    const archive = await archiveStore.createFromSnapshot({
      title: `🚨 Emergency Backup - ${new Date().toLocaleString()}`,
      snapshot: createData.structureSnapshot,
      summary: createData.summary,
      tags: [...createData.tags, 'emergency', 'backup'],
      startedAt: createData.startedAt,
      completedAt: createData.completedAt,
      completionDurationHours: createData.completionDurationHours
    });

    return { 
      success: true, 
      archiveId: archive.id 
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Emergency backup failed' 
    };
  }
}

/**
 * Store ↔ Board同期状態の検証
 */
export function validateSyncStatus() {
  const store = useStructureStore.getState();
  
  return {
    isInSync: true, // Store統一により常に同期
    storeTaskCount: store.tasks.length,
    boardTaskCount: store.tasks.length, // 同一参照
    isDirty: store.isDirty,
    lastSnapshot: store.lastSnapshotAt,
    issues: [] as string[]
  };
}

// ==================== ユーティリティ関数 ====================

/**
 * プロジェクトタイトル生成
 */
function generateProjectTitle(tasks: Task[]): string {
  const completedCount = tasks.filter(t => t.phase === 'DONE').length;
  const totalCount = tasks.length;
  
  // 主要タグから特徴抽出
  const allTags = tasks.flatMap(t => t.tags || []);
  const tagFreq = allTags.reduce((freq, tag) => {
    freq[tag] = (freq[tag] || 0) + 1;
    return freq;
  }, {} as Record<string, number>);
  
  const mainTag = Object.entries(tagFreq)
    .sort(([,a], [,b]) => b - a)[0]?.[0];

  const tagPart = mainTag ? ` (${mainTag})` : '';
  const date = new Date().toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
  
  return `Project ${date}${tagPart} - ${completedCount}/${totalCount} tasks`;
}

/**
 * プロジェクトサマリー生成
 */
function generateProjectSummary(
  tasks: Task[], 
  stats: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    completionDurationHours: number;
  }
): string {
  const { totalTasks, completedTasks, inProgressTasks, completionDurationHours } = stats;
  
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  // 主要成果物
  const mainOutputs = tasks
    .flatMap(t => t.files_out || [])
    .slice(0, 3)
    .join(', ');

  return [
    `Completed ${completedTasks}/${totalTasks} tasks (${completionRate}%)`,
    `Working time: ${completionDurationHours} hours`,
    inProgressTasks > 0 ? `${inProgressTasks} tasks in progress` : 'All tasks completed',
    mainOutputs ? `Key outputs: ${mainOutputs}` : ''
  ].filter(Boolean).join('. ');
}

/**
 * タグ生成（プロジェクト特徴抽出）- 配列確実保証
 */
function generateTags(tasks: Task[]): string[] {
  const allTags = tasks.flatMap(t => Array.isArray(t.tags) ? t.tags : []);
  const uniqueTags = Array.from(new Set(allTags)); // Array.from()でES5互換
  
  // 自動タグ追加
  const autoTags: string[] = [];
  
  // 完了状況ベース
  const completedCount = tasks.filter(t => t.phase === 'DONE').length;
  const totalCount = tasks.length;
  if (completedCount === totalCount) {
    autoTags.push('completed');
  } else if (completedCount > totalCount * 0.8) {
    autoTags.push('near-completion');
  } else {
    autoTags.push('in-progress');
  }
  
  // 規模ベース
  if (totalCount >= 10) {
    autoTags.push('large-project');
  } else if (totalCount >= 5) {
    autoTags.push('medium-project');
  } else {
    autoTags.push('small-project');
  }

  // 確実に配列として返す
  const result = Array.from(new Set([...uniqueTags, ...autoTags]));
  return Array.isArray(result) ? result : [];
}

// ==================== 型変換関数 ====================

/**
 * Task[] → StructureTask[] 変換（配列フィールド保証）
 */
function tasksToStructureTasks(tasks: Task[]) {
  return tasks.map(task => ({
    id: task.id,
    title: task.title,
    phase: task.phase,
    owner: task.owner,
    tags: Array.isArray(task.tags) ? task.tags : [],
    files_out: Array.isArray(task.files_out) ? task.files_out : [],
    deps: Array.isArray(task.deps) ? task.deps : [],
    desc: task.desc,
    goal: task.goal,
    lastWorkedAt: task.lastWorkedAt,
    lastWorkedBy: task.lastWorkedBy,
    estimatedHours: task.estimatedHours,
    actualHours: task.actualHours,
    priority: task.priority,
    status: task.status
  }));
}

/**
 * StructureTask[] → Task[] 変換（配列フィールド保証）
 */
function structureTasksToTasks(structureTasks: any[]) {
  return structureTasks.map(structureTask => ({
    id: structureTask.id,
    title: structureTask.title,
    phase: structureTask.phase,
    owner: structureTask.owner,
    tags: Array.isArray(structureTask.tags) ? structureTask.tags : [],
    files_out: Array.isArray(structureTask.files_out) ? structureTask.files_out : [],
    deps: Array.isArray(structureTask.deps) ? structureTask.deps : [],
    desc: structureTask.desc,
    goal: structureTask.goal,
    lastWorkedAt: structureTask.lastWorkedAt,
    lastWorkedBy: structureTask.lastWorkedBy,
    estimatedHours: structureTask.estimatedHours,
    actualHours: structureTask.actualHours,
    priority: structureTask.priority,
    status: structureTask.status
  }));
}