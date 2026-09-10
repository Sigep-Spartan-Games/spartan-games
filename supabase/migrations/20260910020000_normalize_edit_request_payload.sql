-- Finish the terminology cleanup inside structured edit-request JSON. The
-- application and database now use the same canonical typed-value key.

begin;

update public.submission_edit_requests
set suggested_changes =
  (suggested_changes - 'activity_units')
  || case
    when suggested_changes ? 'activity_value_number' then '{}'::jsonb
    else jsonb_build_object('activity_value_number', suggested_changes->'activity_units')
  end,
  updated_at = now()
where suggested_changes ? 'activity_units';

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
  v_normalized_changes jsonb;
begin
  if v_uid is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  if nullif(trim(p_reason), '') is null then raise exception 'A reason is required'; end if;
  if p_suggested_changes is null or jsonb_typeof(p_suggested_changes) <> 'object' then
    raise exception 'Suggested changes must be a JSON object';
  end if;
  if exists (
    select 1 from jsonb_object_keys(p_suggested_changes) key
    where key not in (
      'activity_key', 'activity_date', 'activity_units', 'activity_value_number', 'activity_value_text',
      'activity_value_bool', 'did_with_teammate', 'is_deletion'
    )
  ) then raise exception 'Suggested changes contain unsupported fields'; end if;

  v_normalized_changes := p_suggested_changes;
  if v_normalized_changes ? 'activity_units' then
    v_normalized_changes :=
      (v_normalized_changes - 'activity_units')
      || case
        when v_normalized_changes ? 'activity_value_number' then '{}'::jsonb
        else jsonb_build_object('activity_value_number', v_normalized_changes->'activity_units')
      end;
  end if;

  select s.team_id into v_team_id
  from public.submissions s
  where s.id = p_submission_id
    and s.submitted_by = v_uid
    and s.submission_kind = 'activity'
    and s.voided_at is null;
  if v_team_id is null then raise exception 'Submission not found or not owned by requester' using errcode = '42501'; end if;

  v_request_type := case when coalesce((v_normalized_changes->>'is_deletion')::boolean, false) then 'delete' else 'edit' end;
  insert into public.submission_edit_requests (
    submission_id, user_id, suggested_changes, reason, status, request_type
  ) values (
    p_submission_id, v_uid, v_normalized_changes, trim(p_reason), 'pending', v_request_type
  ) returning id into v_request_id;
  return v_request_id;
exception
  when unique_violation then raise exception 'A pending request already exists for this submission';
end;
$$;

comment on column public.submission_edit_requests.suggested_changes is
  'Allow-listed typed submission changes; numeric values are stored as activity_value_number.';

commit;
