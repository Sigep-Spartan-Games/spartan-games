-- The canonical-key application is deployed before this migration. Stop
-- accepting the retired activity_units JSON key after the zero-downtime bridge.

begin;

create or replace function public.request_submission_edit_v2(
  p_submission_id uuid,
  p_suggested_changes jsonb,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_team_id uuid;
  v_request_id uuid;
  v_request_type text;
begin
  if v_uid is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  if nullif(trim(p_reason), '') is null then raise exception 'A reason is required'; end if;
  if p_suggested_changes is null or jsonb_typeof(p_suggested_changes) <> 'object' then
    raise exception 'Suggested changes must be a JSON object';
  end if;
  if exists (
    select 1 from jsonb_object_keys(p_suggested_changes) key
    where key not in (
      'activity_key', 'activity_date', 'activity_value_number', 'activity_value_text',
      'activity_value_bool', 'did_with_teammate', 'is_deletion'
    )
  ) then raise exception 'Suggested changes contain unsupported fields'; end if;

  select s.team_id into v_team_id
  from public.submissions s
  where s.id = p_submission_id
    and s.submitted_by = v_uid
    and s.submission_kind = 'activity'
    and s.voided_at is null;
  if v_team_id is null then raise exception 'Submission not found or not owned by requester' using errcode = '42501'; end if;

  v_request_type := case when coalesce((p_suggested_changes->>'is_deletion')::boolean, false) then 'delete' else 'edit' end;
  insert into public.submission_edit_requests (
    submission_id, user_id, suggested_changes, reason, status, request_type
  ) values (
    p_submission_id, v_uid, p_suggested_changes, trim(p_reason), 'pending', v_request_type
  ) returning id into v_request_id;
  return v_request_id;
exception
  when unique_violation then raise exception 'A pending request already exists for this submission';
end;
$$;

commit;
