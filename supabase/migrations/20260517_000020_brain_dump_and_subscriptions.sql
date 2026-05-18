-- ── Track 1: Brain dump card creation fields ────────────────────────────────

-- Add story context fields to tasks
alter table public.tasks
  add column if not exists context text,
  add column if not exists raw_quote text,
  add column if not exists created_via text default 'form'
    check (created_via in ('form', 'brain_dump', 'voice', 'ai_suggestion', 'template'));

-- Brain dump conversation persistence
create table if not exists public.brain_dump_conversations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  chapter_id uuid references public.boards(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  messages jsonb not null default '[]',
  cards_captured int default 0,
  last_active_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists brain_dump_conversations_lookup
  on public.brain_dump_conversations(user_id, chapter_id, last_active_at desc);

-- Enable RLS
alter table public.brain_dump_conversations enable row level security;

create policy "Users can manage their own brain dump conversations"
  on public.brain_dump_conversations
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Track template usage so AI can surface most-used templates first
alter table public.workflow_templates
  add column if not exists usage_count int not null default 0;

-- ── Track 2: Cross-platform subscription table ───────────────────────────────

create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  platform text not null default 'none',
  -- 'none' | 'stripe' | 'apple' | 'android' | 'promotional'
  status text not null default 'free',
  -- 'free' | 'active' | 'cancelled' | 'expired' | 'paused' | 'grace_period'
  plan_id text,
  -- 'authored_builder_monthly' | 'authored_builder_annual' | 'authored_team_monthly'
  entitlement text,
  -- 'builder_access' | 'team_access'
  platform_subscription_id text,
  revenuecat_app_user_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  cancelled_at timestamptz,
  raw_webhook_payload jsonb,
  updated_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists user_subscriptions_user_id_idx
  on public.user_subscriptions(user_id);

create index if not exists user_subscriptions_revenuecat_id_idx
  on public.user_subscriptions(revenuecat_app_user_id);

-- RLS
alter table public.user_subscriptions enable row level security;

create policy "Users can read their own subscription"
  on public.user_subscriptions
  for select
  using (user_id = auth.uid());

-- Service role (used by webhook handler) bypasses RLS automatically.

-- Auto-create a free subscription row when a new user signs up
create or replace function public.create_default_subscription()
returns trigger as $$
begin
  insert into public.user_subscriptions (user_id, platform, status)
  values (new.id, 'none', 'free')
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created_subscription on auth.users;

create trigger on_auth_user_created_subscription
  after insert on auth.users
  for each row execute function public.create_default_subscription();

-- Updated_at trigger for user_subscriptions
create trigger set_user_subscriptions_updated_at
  before update on public.user_subscriptions
  for each row execute function public.set_updated_at();
