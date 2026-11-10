-- ═══════════════════════════════════════════════════════════
-- 成绩分析 · Supabase 初始化脚本
-- 用法：Supabase 控制台 → SQL Editor → New query → 粘贴全部 → Run
-- 说明：所有表都开启 RLS，每个账号只能读写自己的数据
-- ═══════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- 学生
create table if not exists public.students (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid(),
  name        text not null,
  nickname    text,
  grade       int,
  enroll_year int,
  school      text,
  class_name  text,
  status      text default 'active',
  created_at  timestamptz default now()
);

-- 考试
create table if not exists public.exams (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid(),
  student_id  uuid not null references public.students(id) on delete cascade,
  name        text not null,
  type        text,
  date        date,
  grade       int,
  semester    text,
  class_size  int,
  grade_size  int,
  class_rank  int,
  grade_rank  int,
  class_avg   numeric,
  grade_avg   numeric,
  note        text,
  created_at  timestamptz default now()
);

-- 单科成绩
create table if not exists public.scores (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid(),
  exam_id     uuid not null references public.exams(id) on delete cascade,
  subject     text not null,
  raw         numeric,
  full        numeric,
  grade       text,
  a_paper     numeric,
  a_full      numeric,
  b_paper     numeric,
  b_full      numeric,
  class_avg   numeric,
  class_rank  int,
  created_at  timestamptz default now()
);

-- 目标校
create table if not exists public.targets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid(),
  student_id  uuid references public.students(id) on delete cascade,
  school_id   text,
  school_name text,
  line        numeric,
  rank        int,
  adjust      numeric,
  level       text default 'C',
  year        int default 2026,
  created_at  timestamptz default now()
);

-- 索引
create index if not exists idx_students_user on public.students(user_id);
create index if not exists idx_exams_user    on public.exams(user_id);
create index if not exists idx_exams_student on public.exams(student_id);
create index if not exists idx_scores_user   on public.scores(user_id);
create index if not exists idx_scores_exam   on public.scores(exam_id);
create index if not exists idx_targets_user  on public.targets(user_id);
create index if not exists idx_targets_stu   on public.targets(student_id);

-- RLS：每个账号只能访问自己的行
alter table public.students enable row level security;
alter table public.exams    enable row level security;
alter table public.scores   enable row level security;
alter table public.targets  enable row level security;

drop policy if exists own_students on public.students;
drop policy if exists own_exams    on public.exams;
drop policy if exists own_scores   on public.scores;
drop policy if exists own_targets  on public.targets;

create policy own_students on public.students
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy own_exams on public.exams
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy own_scores on public.scores
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy own_targets on public.targets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 完成。回到网页「设置」页，填 Project URL 和 anon public key，注册账号即可。
