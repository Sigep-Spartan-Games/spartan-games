
-- Helper: build the human-readable week identifier used by weekly_history
-- e.g. "Mar 2 - 8, 2026" or "Feb 23 - Mar 1, 2026"
CREATE OR REPLACE FUNCTION public.week_identifier(p_monday date)
RETURNS text
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_sunday date := p_monday + 6;
  v_months text[] := ARRAY['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  v_start_month text;
  v_end_month text;
BEGIN
  v_start_month := v_months[extract(month from p_monday)::int];
  v_end_month   := v_months[extract(month from v_sunday)::int];

  IF extract(month from p_monday) = extract(month from v_sunday) THEN
    RETURN v_start_month || ' ' || extract(day from p_monday)::int || ' - '
           || extract(day from v_sunday)::int || ', ' || extract(year from v_sunday)::int;
  ELSE
    RETURN v_start_month || ' ' || extract(day from p_monday)::int || ' - '
           || v_end_month || ' ' || extract(day from v_sunday)::int || ', ' || extract(year from v_sunday)::int;
  END IF;
END;
$$;

-- Upgraded finalize_week: per-tier winners + weekly history recording
CREATE OR REPLACE FUNCTION public.finalize_week(p_week_start date)
RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  v_week_start date := public.week_start(p_week_start);
  v_week_end   date := v_week_start + 7;
  v_last_final date;
  v_week_id    text;
  r_tier       record;
  r_winner     record;
BEGIN
  -- Lock the single game_settings row so two finalizations can't race
  SELECT last_week_finalized
    INTO v_last_final
  FROM public.game_settings
  WHERE id = true
  FOR UPDATE;

  -- Guard: don't finalize the same week twice
  IF v_last_final IS NOT NULL AND v_last_final >= v_week_start THEN
    UPDATE public.game_settings
      SET finalize_requested = false
    WHERE id = true;
    RETURN;
  END IF;

  -- Build the human-readable week identifier for weekly_history
  v_week_id := public.week_identifier(v_week_start);

  -- ── Step 1: Record weekly history ──────────────────────────────────
  -- Compute each team's weekly points from submissions (the source of truth)
  INSERT INTO public.weekly_history
    (id, team_id, week_identifier, weekly_points, tier, weekly_goal, met_goal, weeks_won_count, streak_count)
  SELECT
    gen_random_uuid(),
    t.id,
    v_week_id,
    coalesce(wp.pts, 0),
    t.tier,
    coalesce(ts.weekly_goal, 100),
    coalesce(wp.pts, 0) >= coalesce(ts.weekly_goal, 100),
    coalesce(array_length(t.weeks_won, 1), 0),
    coalesce(t.streak_count, 0)
  FROM public.teams t
  LEFT JOIN (
    SELECT s.team_id, sum(s.points_awarded)::int AS pts
    FROM public.submissions s
    WHERE s.activity_date >= v_week_start
      AND s.activity_date <  v_week_end
    GROUP BY s.team_id
  ) wp ON wp.team_id = t.id
  LEFT JOIN public.tier_settings ts ON ts.tier = t.tier
  ON CONFLICT (team_id, week_identifier) DO NOTHING;

  -- ── Step 2: Find per-tier winners and award weeks_won ──────────────
  FOR r_tier IN
    SELECT DISTINCT t.tier
    FROM public.teams t
    WHERE t.tier IS NOT NULL
  LOOP
    -- Find the team with the most submission points in this tier for the week
    SELECT t.id AS team_id, coalesce(sum(s.points_awarded), 0)::int AS week_points
      INTO r_winner
    FROM public.teams t
    LEFT JOIN public.submissions s
      ON s.team_id = t.id
     AND s.activity_date >= v_week_start
     AND s.activity_date <  v_week_end
    WHERE t.tier = r_tier.tier
    GROUP BY t.id
    ORDER BY coalesce(sum(s.points_awarded), 0) DESC,
             t.total_points DESC,
             t.created_at ASC
    LIMIT 1;

    -- Only award if they actually scored something
    IF r_winner IS NOT NULL AND r_winner.week_points > 0 THEN
      UPDATE public.teams
        SET weeks_won = coalesce(weeks_won, '{}'::date[]) || v_week_start
      WHERE id = r_winner.team_id;
    END IF;
  END LOOP;

  -- ── Step 3: Roll weekly points into total_points ───────────────────
  WITH week_totals AS (
    SELECT team_id, sum(points_awarded)::int AS pts
    FROM public.submissions
    WHERE activity_date >= v_week_start
      AND activity_date <  v_week_end
    GROUP BY team_id
  )
  UPDATE public.teams t
  SET total_points = t.total_points + coalesce(wt.pts, 0)
  FROM week_totals wt
  WHERE wt.team_id = t.id;

  -- ── Step 4: Reset weekly_points for next week ──────────────────────
  UPDATE public.teams
  SET weekly_points = 0;

  -- ── Step 5: Mark finalized + clear request ─────────────────────────
  UPDATE public.game_settings
  SET last_week_finalized = v_week_start,
      finalize_requested  = false
  WHERE id = true;
END;
$$;
;
