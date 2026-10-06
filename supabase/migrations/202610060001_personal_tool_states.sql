-- Run in a new Supabase project. Existing Ottlog identities stay in the API.
-- This table is accessed ONLY by the authenticated Ottlog API's server secret.
begin;

create table public.personal_tool_states (
    owner text not null check (owner ~ '^(admin|reader):[A-Za-z0-9_-]{1,80}$'),
    key text not null check (key in (
        'meals', 'reminders', 'todos', 'pomodoro', 'memos', 'dining',
        'mottos', 'growth', 'domains'
    )),
    data jsonb not null,
    updated_at timestamptz not null default now(),
    primary key (owner, key)
);

alter table public.personal_tool_states enable row level security;
revoke all on table public.personal_tool_states from public, anon, authenticated;
grant select, insert, update on table public.personal_tool_states to service_role;

create function public.touch_personal_tool_state() returns trigger
language plpgsql set search_path = '' as $$
begin
    new.updated_at := now();
    return new;
end;
$$;
revoke all on function public.touch_personal_tool_state() from public, anon, authenticated;
create trigger personal_tool_states_updated
before update on public.personal_tool_states
for each row execute function public.touch_personal_tool_state();

comment on table public.personal_tool_states is
'Ottlog account-isolated tool snapshots. owner comes from API claims, never client input. JSON IDs and historical formats preserved.';
notify pgrst, 'reload schema';
commit;
