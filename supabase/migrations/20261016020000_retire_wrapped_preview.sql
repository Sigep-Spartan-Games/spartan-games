begin;

-- Wrapped is now released automatically when a season is completed. The
-- administrator-only live preview is no longer part of the product surface.
drop function if exists public.get_season_wrapped_preview_v1(uuid, uuid);

comment on function public.get_my_season_wrapped_v1(uuid) is
  'Returns the authenticated player and team recap after an eligible season is completed.';

commit;
