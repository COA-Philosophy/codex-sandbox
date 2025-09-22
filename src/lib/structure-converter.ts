// path: src/lib/structure-converter.ts
import type { Task } from '@/types/structure';
import type { StructureTask } from '@/types/archive';

/**
 * Task → StructureTask 変換
 * StructureBoard の Task を Archive 形式に変換
 */
export function taskToStructureTask(task: Task): StructureTask {
  return {
    id: task.id,
    title: task.title,
    phase: task.phase,
    owner: task.owner as any, // Task.owner は "AI" | "HUMAN", StructureTask は "AI" | "HUMAN" | "MIXED"
    tags: task.tags,
    files_out: task.files_out,
    deps: task.deps,
    desc: task.desc,
    goal: task.goal,
    lastWorkedAt: task.lastWorkedAt,
    lastWorkedBy: task.lastWorkedBy,
    estimatedHours: task.estimatedHours,
    actualHours: task.actualHours,
    priority: task.priority,
    status: task.status,
  };
}

/**
 * StructureTask → Task 変換
 * Archive形式を StructureBoard の Task に変換
 */
export function structureTaskToTask(structureTask: StructureTask): Task {
  return {
    id: structureTask.id,
    title: structureTask.title,
    phase: structureTask.phase,
    owner: structureTask.owner === 'MIXED' ? 'HUMAN' : structureTask.owner, // MIXED を HUMAN にフォールバック
    tags: structureTask.tags,
    files_out: structureTask.files_out,
    deps: structureTask.deps,
    desc: structureTask.desc,
    goal: structureTask.goal,
    lastWorkedAt: structureTask.lastWorkedAt,
    lastWorkedBy: structureTask.lastWorkedBy,
    estimatedHours: structureTask.estimatedHours,
    actualHours: structureTask.actualHours,
    priority: structureTask.priority,
    status: structureTask.status,
  };
}

/**
 * Task配列の一括変換
 */
export function tasksToStructureTasks(tasks: Task[]): StructureTask[] {
  return tasks.map(taskToStructureTask);
}

/**
 * StructureTask配列の一括変換
 */
export function structureTasksToTasks(structureTasks: StructureTask[]): Task[] {
  return structureTasks.map(structureTaskToTask);
}