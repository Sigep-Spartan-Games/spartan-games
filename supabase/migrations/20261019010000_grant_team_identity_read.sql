begin;

-- team_standings and active_teams are security-invoker views. Authenticated
-- users therefore need explicit access to every safe teams column projected by
-- those views. Keep invite_code excluded; it is only returned by get_my_team_v2.
grant select (emblem_key, color_key, motto)
on table public.teams
to authenticated;

commit;
