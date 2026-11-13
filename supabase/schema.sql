-- =====================================================================
-- Raiz — esquema do banco de dados
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run.
-- Pode rodar mais de uma vez sem problema.
-- =====================================================================

create extension if not exists pgcrypto;

-- Perfil: XP, protetores de sequência, melhor sequência ----------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  xp integer not null default 0,
  freezes integer not null default 1,
  best_streak integer not null default 0,
  freeze_awarded_on date,
  hard_mode_date date,
  created_at timestamptz not null default now()
);

-- Hábitos diários ------------------------------------------------------
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  icon text not null default '✨',
  target_per_week smallint not null default 7 check (target_per_week between 1 and 7),
  essential boolean not null default false,
  archived boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- Cada hábito concluído em um dia -------------------------------------
create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  date date not null,
  created_at timestamptz not null default now(),
  unique (habit_id, date)
);

-- Tarefas avulsas do dia ----------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  text text not null,
  date date not null,
  done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now()
);

-- Check-in de humor e ansiedade (manhã / noite) -----------------------
create table if not exists public.mood_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  period text not null check (period in ('manha', 'noite')),
  mood smallint not null check (mood between 1 and 5),
  anxiety smallint not null check (anxiety between 0 and 10),
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, date, period)
);

-- Registro de impulsos ("surfar a onda") ------------------------------
create table if not exists public.impulse_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  kind text,
  intensity_before smallint check (intensity_before between 1 and 10),
  intensity_after smallint check (intensity_after between 1 and 10),
  resisted boolean not null,
  triggers text[] not null default '{}',
  note text,
  created_at timestamptz not null default now()
);

-- Sessões de meditação ------------------------------------------------
create table if not exists public.meditation_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  minutes integer not null check (minutes > 0),
  mode text,
  created_at timestamptz not null default now()
);

-- Quantas vezes você notou a distração e voltou para a respiração
alter table public.meditation_sessions add column if not exists returns integer not null default 0;

-- Escrita terapêutica (diário) -----------------------------------------
create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  prompt text,
  content text not null,
  minutes integer not null default 0,
  created_at timestamptz not null default now()
);

-- Metas: "dias livre de..." e metas numéricas -------------------------
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  icon text not null default '🎯',
  kind text not null check (kind in ('days', 'count')),
  target integer,
  current integer not null default 0,
  start_date date,
  best integer not null default 0,
  resets integer not null default 0,
  milestone integer not null default 0,
  completed_at timestamptz,
  archived boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- Histórico de "Começar agora" (consegui / fiz um pouco / não deu) -----
create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  habit_id uuid references public.habits(id) on delete set null,
  minutes integer not null default 0,
  outcome text not null check (outcome in ('done', 'partial', 'not')),
  mini boolean not null default false,
  started_at timestamptz,
  created_at timestamptz not null default now()
);

-- Plano anti-impulso, motivos, lembretes e foco da semana (no perfil) --
alter table public.profiles add column if not exists reasons text[] not null default '{}';
alter table public.profiles add column if not exists if_then jsonb not null default '[]';
alter table public.profiles add column if not exists reminders jsonb;
alter table public.profiles add column if not exists reminders_sent jsonb not null default '{}';
alter table public.profiles add column if not exists focus_reminder_at timestamptz;
alter table public.profiles add column if not exists weekly_focus_habit uuid;
alter table public.profiles add column if not exists weekly_focus_week date;

-- Aparelhos que recebem lembretes (notificações) ----------------------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

-- Revisão da semana -----------------------------------------------------
create table if not exists public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  week_start date not null,
  summary jsonb not null default '{}',
  went_well text,
  focus_habit_id uuid references public.habits(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

-- Dias salvos por um protetor de sequência ----------------------------
create table if not exists public.streak_freezes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

-- Conquistas desbloqueadas --------------------------------------------
create table if not exists public.achievements (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  code text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, code)
);

-- v5: hábitos flexíveis, quantidade, moedas, missões e configurações ---
-- dias da semana (1=seg … 7=dom; vazio = todos), período, meta diária, tipo
alter table public.habits add column if not exists days smallint[];
alter table public.habits add column if not exists time_of_day text;
alter table public.habits add column if not exists daily_goal integer not null default 1;
alter table public.habits add column if not exists unit text;
alter table public.habits add column if not exists kind text;
alter table public.habits add column if not exists remind_at text;
alter table public.habits add column if not exists color text;
alter table public.habit_logs add column if not exists amount integer not null default 1;
alter table public.tasks add column if not exists priority smallint not null default 0;
alter table public.tasks add column if not exists note text;
alter table public.profiles add column if not exists coins integer not null default 0;
alter table public.profiles add column if not exists settings jsonb not null default '{}';
alter table public.profiles add column if not exists daily jsonb not null default '{}';

-- Índices --------------------------------------------------------------
create index if not exists habit_logs_user_date on public.habit_logs (user_id, date);
create index if not exists tasks_user_date on public.tasks (user_id, date);
create index if not exists mood_user_date on public.mood_checkins (user_id, date);
create index if not exists impulse_user_date on public.impulse_logs (user_id, date);
create index if not exists med_user_date on public.meditation_sessions (user_id, date);
create index if not exists journal_user_date on public.journal_entries (user_id, date);
create index if not exists goals_user on public.goals (user_id);

-- Segurança: cada pessoa só enxerga e altera os PRÓPRIOS dados ---------
alter table public.profiles            enable row level security;
alter table public.habits              enable row level security;
alter table public.habit_logs          enable row level security;
alter table public.tasks               enable row level security;
alter table public.mood_checkins       enable row level security;
alter table public.impulse_logs        enable row level security;
alter table public.meditation_sessions enable row level security;
alter table public.streak_freezes      enable row level security;
alter table public.achievements        enable row level security;
alter table public.journal_entries     enable row level security;
alter table public.goals               enable row level security;
alter table public.focus_sessions      enable row level security;
alter table public.push_subscriptions  enable row level security;
alter table public.weekly_reviews      enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

do $$
declare t text;
begin
  foreach t in array array['habits','habit_logs','tasks','mood_checkins','impulse_logs',
                           'meditation_sessions','streak_freezes','achievements',
                           'journal_entries','goals','focus_sessions',
                           'push_subscriptions','weekly_reviews']
  loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('create policy "own rows" on public.%I for all
                    using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;

grant select, insert, update, delete on all tables in schema public to authenticated;
-- a função de lembretes (chave de administrador) precisa ler e atualizar tudo
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
revoke all on all tables in schema public from anon;
