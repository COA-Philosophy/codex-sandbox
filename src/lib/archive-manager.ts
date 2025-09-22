// src/lib/archive-manager.ts
// Phase B3対応: v2_テーブル + 型定義統一 + RLS環境分離対応

import { supabase } from './supabase';
import type { ProjectArchive, StructureSnapshot, CreateArchiveInput, UpdateArchiveInput } from '@/types/archive';
import { getEnvironment } from '@/types/common';

export async function listArchives(): Promise<ProjectArchive[]> {
  const { data, error } = await supabase
    .from('v2_project_archives')
    .select('*')
    .eq('environment', getEnvironment())
    .order('completed_at', { ascending: false });

  if (error) throw error;
  return data as ProjectArchive[];
}

export async function getArchive(id: string): Promise<ProjectArchive> {
  const { data, error } = await supabase
    .from('v2_project_archives')
    .select('*')
    .eq('id', id)
    .eq('environment', getEnvironment())
    .single();

  if (error) throw error;
  return data as ProjectArchive;
}

export async function createArchive(input: CreateArchiveInput): Promise<ProjectArchive> {
  const payload = {
    title: input.title,
    structure_snapshot: input.structureSnapshot,
    handoff_history: input.handoffHistory,
    final_summary: input.summary ?? null,
    started_at: input.startedAt ?? null,
    completed_at: input.completedAt ?? new Date().toISOString(),
    tags: input.tags ?? [],
    completion_duration_hours: input.completionDurationHours ?? null,
    environment: getEnvironment(),
  };

  const { data, error } = await supabase
    .from('v2_project_archives')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return data as ProjectArchive;
}

export async function updateArchive(id: string, input: UpdateArchiveInput): Promise<ProjectArchive> {
  const patch: Record<string, unknown> = {};
  if (typeof input.title === 'string') patch.title = input.title;
  if (input.structureSnapshot !== undefined) patch.structure_snapshot = input.structureSnapshot;
  if (input.handoffHistory !== undefined) patch.handoff_history = input.handoffHistory;
  if (input.summary !== undefined) patch.final_summary = input.summary;
  if (input.startedAt !== undefined) patch.started_at = input.startedAt;
  if (input.completedAt !== undefined) patch.completed_at = input.completedAt;
  if (input.tags !== undefined) patch.tags = input.tags;
  if (input.completionDurationHours !== undefined) patch.completion_duration_hours = input.completionDurationHours;

  const { data, error } = await supabase
    .from('v2_project_archives')
    .update(patch)
    .eq('id', id)
    .eq('environment', getEnvironment())
    .select('*')
    .single();

  if (error) throw error;
  return data as ProjectArchive;
}

export async function deleteArchive(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('v2_project_archives')
    .delete()
    .eq('id', id)
    .eq('environment', getEnvironment());
    
  if (error) throw error;
  return true;
}