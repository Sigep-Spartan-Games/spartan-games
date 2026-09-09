
-- Add policy for users to join a team (update member2 slot if it's empty)
-- This allows a user to set themselves as member2 if they're not already on a team
CREATE POLICY teams_join_team ON public.teams
  FOR UPDATE
  USING (
    -- Allow if user is joining an open spot
    (member2_id IS NULL AND member1_id IS NOT NULL)
    OR
    -- Or if user is already a member of this team
    (member1_id = auth.uid() OR member2_id = auth.uid())
  )
  WITH CHECK (
    -- Ensure the user is setting themselves as a member
    (member1_id = auth.uid() OR member2_id = auth.uid())
  );

-- Add policy for users to leave a team (set their slot to null)
CREATE POLICY teams_leave_team ON public.teams
  FOR UPDATE
  USING (
    -- User must be a current member
    member1_id = auth.uid() OR member2_id = auth.uid()
  )
  WITH CHECK (
    -- Allow setting member slots to null (leaving)
    -- Or the user must still be a member after the update
    (member1_id IS NULL OR member1_id = auth.uid() OR member2_id = auth.uid())
  );

-- Add policy for team captain to rename the team
CREATE POLICY teams_captain_update ON public.teams
  FOR UPDATE
  USING (
    -- Only member1 (captain) can update team details
    member1_id = auth.uid()
  )
  WITH CHECK (
    -- Captain must remain captain after update
    member1_id = auth.uid()
  );

-- Add DELETE policy for last member leaving (team cleanup)
CREATE POLICY teams_delete_empty ON public.teams
  FOR DELETE
  USING (
    -- User must be a current member to delete
    member1_id = auth.uid() OR member2_id = auth.uid()
  );
;
