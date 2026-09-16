begin;

create table public.announcement_events (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  actor_id uuid references auth.users(id) on delete set null,
  slack_user_id text,
  slack_team_id text,
  slack_channel_id text,
  subject_snapshot text not null,
  message_length integer not null,
  slack_requested boolean not null,
  email_requested boolean not null,
  slack_status text not null,
  email_status text not null,
  email_recipient_count integer not null default 0,
  email_sent_count integer not null default 0,
  error_summary text,
  created_at timestamptz not null default now(),
  constraint announcement_events_source_check
    check (source in ('admin_ui', 'slack_command')),
  constraint announcement_events_subject_length_check
    check (char_length(subject_snapshot) between 1 and 150),
  constraint announcement_events_message_length_check
    check (message_length between 1 and 5000),
  constraint announcement_events_slack_status_check
    check (slack_status in ('not_requested', 'sent', 'failed')),
  constraint announcement_events_email_status_check
    check (email_status in ('not_requested', 'sent', 'partial', 'failed')),
  constraint announcement_events_counts_check
    check (
      email_recipient_count >= 0
      and email_sent_count >= 0
      and email_sent_count <= email_recipient_count
    )
);

create index announcement_events_created_at_idx
on public.announcement_events (created_at desc);

create index announcement_events_actor_idx
on public.announcement_events (actor_id, created_at desc)
where actor_id is not null;

alter table public.announcement_events enable row level security;

create policy announcement_events_read_admin
on public.announcement_events
for select
to authenticated
using (public.is_admin(auth.uid()));

revoke all on table public.announcement_events
from public, anon, authenticated, service_role;
grant select on table public.announcement_events to authenticated;
grant select, insert on table public.announcement_events to service_role;

create or replace function public.prevent_announcement_event_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Announcement audit events are immutable';
end;
$$;

create trigger announcement_events_immutable
before update or delete on public.announcement_events
for each row execute function public.prevent_announcement_event_mutation();

revoke all on function public.prevent_announcement_event_mutation()
from public, anon, authenticated;

comment on table public.announcement_events is
  'Immutable audit metadata for administrator and Slack-triggered announcement deliveries. Message bodies are not retained.';

commit;
