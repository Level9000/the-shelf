alter table public.projects
add column if not exists goal text,
add column if not exists why_it_matters text,
add column if not exists success_looks_like text,
add column if not exists done_definition text;
