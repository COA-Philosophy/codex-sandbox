-- supabase/migrations/001_initial_3layer.sql
-- Phase B: V1 Supabase 対応版 - v2_接頭辞 + 環境分離 + RLS強化

-- 拡張
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ============ v2_users ============
create table if not exists public.v2_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  display_name text,
  working_style_data jsonb not null default '{}'::jsonb, -- Gemini学習の素材
  environment text not null default 'dev' check (environment in ('dev','stg','prod')),
  created_at timestamptz not null default now()
);

alter table public.v2_users enable row level security;

-- 自分自身のみ参照/更新可
create policy v2_users_select_self on public.v2_users
  for select using (auth.uid() = id);
create policy v2_users_insert_self on public.v2_users
  for insert with check (auth.uid() = id);
create policy v2_users_update_self on public.v2_users
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- ============ v2_project_archives ============
create table if not exists public.v2_project_archives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.v2_users(id) on delete cascade,
  title text not null,
  structure_snapshot jsonb not null,   -- StructureTask[] そのまま保存
  handoff_history jsonb not null,      -- HandoffEntry[] そのまま保存
  final_summary text,
  task_count integer generated always as (jsonb_array_length(structure_snapshot)) stored,
  completion_duration_hours integer,
  tags text[] not null default '{}',
  started_at timestamptz,
  completed_at timestamptz default now(),
  environment text not null default 'dev' check (environment in ('dev','stg','prod')),
  created_at timestamptz not null default now()
);

alter table public.v2_project_archives enable row level security;

-- 自分のアーカイブのみ全操作可
create policy v2_pa_select_own on public.v2_project_archives
  for select using (auth.uid() = user_id);
create policy v2_pa_cud_own on public.v2_project_archives
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============ v2_basic_insights ============
create table if not exists public.v2_basic_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.v2_users(id) on delete cascade,
  insight_type text not null check (insight_type in ('task_pattern','handoff_style','completion_rhythm')),
  content text not null,
  confidence float default 1.0,
  related_archive_ids uuid[] not null default '{}',
  environment text not null default 'dev' check (environment in ('dev','stg','prod')),
  created_at timestamptz not null default now()
);

alter table public.v2_basic_insights enable row level security;

create policy v2_bi_all_own on public.v2_basic_insights
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============ v2_chat_sessions ============
create table if not exists public.v2_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.v2_users(id) on delete cascade,
  archive_id uuid references public.v2_project_archives(id) on delete set null,
  title text not null,
  message_count integer not null default 0,
  environment text not null default 'dev' check (environment in ('dev','stg','prod')),
  created_at timestamptz not null default now()
);

alter table public.v2_chat_sessions enable row level security;

create policy v2_cs_all_own on public.v2_chat_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============ v2_chat_messages ============
create table if not exists public.v2_chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.v2_users(id) on delete cascade,
  session_id uuid not null references public.v2_chat_sessions(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  environment text not null default 'dev' check (environment in ('dev','stg','prod')),
  created_at timestamptz not null default now()
);

alter table public.v2_chat_messages enable row level security;

create policy v2_cm_select_own on public.v2_chat_messages
  for select using (auth.uid() = user_id);
create policy v2_cm_insert_own on public.v2_chat_messages
  for insert with check (auth.uid() = user_id);
create policy v2_cm_delete_own on public.v2_chat_messages
  for delete using (auth.uid() = user_id);
create policy v2_cm_update_forbidden on public.v2_chat_messages
  for update using (false);

-- 推奨index
create index if not exists idx_v2_pa_user_completed on public.v2_project_archives(user_id, completed_at desc);
create index if not exists idx_v2_pa_tags on public.v2_project_archives using gin(tags);
create index if not exists idx_v2_cm_session_created on public.v2_chat_messages(session_id, created_at asc);