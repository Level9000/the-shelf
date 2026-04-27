create table if not exists public.workflow_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  trigger_phrase text not null check (char_length(trim(trigger_phrase)) > 0),
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, name)
);

create table if not exists public.workflow_template_steps (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.workflow_templates(id) on delete cascade,
  position integer not null,
  title text not null check (char_length(trim(title)) > 0),
  description text,
  suggested_column text not null default 'To Do',
  priority text check (priority in ('low', 'medium', 'high')),
  due_date text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (template_id, position)
);

alter table public.tasks
add column if not exists source_template_id uuid references public.workflow_templates(id) on delete set null;

create index if not exists workflow_templates_user_id_updated_at_idx
on public.workflow_templates(user_id, updated_at desc);

create index if not exists workflow_template_steps_template_id_position_idx
on public.workflow_template_steps(template_id, position);

create index if not exists tasks_source_template_id_idx
on public.tasks(source_template_id);

drop trigger if exists set_workflow_templates_updated_at on public.workflow_templates;

create trigger set_workflow_templates_updated_at
before update on public.workflow_templates
for each row
execute function public.set_updated_at();

create or replace function public.owns_template(template_uuid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.workflow_templates
    where id = template_uuid and user_id = auth.uid()
  );
$$;

alter table public.workflow_templates enable row level security;
alter table public.workflow_template_steps enable row level security;

create policy "workflow_templates_select_own"
on public.workflow_templates
for select
to authenticated
using (user_id = auth.uid());

create policy "workflow_templates_insert_own"
on public.workflow_templates
for insert
to authenticated
with check (user_id = auth.uid());

create policy "workflow_templates_update_own"
on public.workflow_templates
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "workflow_templates_delete_own"
on public.workflow_templates
for delete
to authenticated
using (user_id = auth.uid());

create policy "workflow_template_steps_select_own"
on public.workflow_template_steps
for select
to authenticated
using (public.owns_template(template_id));

create policy "workflow_template_steps_insert_own"
on public.workflow_template_steps
for insert
to authenticated
with check (public.owns_template(template_id));

create policy "workflow_template_steps_update_own"
on public.workflow_template_steps
for update
to authenticated
using (public.owns_template(template_id))
with check (public.owns_template(template_id));

create policy "workflow_template_steps_delete_own"
on public.workflow_template_steps
for delete
to authenticated
using (public.owns_template(template_id));
