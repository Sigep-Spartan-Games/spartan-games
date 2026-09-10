export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          archived_at: string | null
          created_at: string
          description: string | null
          id: string
          key: string
          label: string
          measurement_type: string
          min_value: number | null
          step_value: number | null
          unit_label: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          key: string
          label: string
          measurement_type: string
          min_value?: number | null
          step_value?: number | null
          unit_label?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          label?: string
          measurement_type?: string
          min_value?: number | null
          step_value?: number | null
          unit_label?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      competition_weeks: {
        Row: {
          created_at: string
          ends_on: string
          finalized_at: string | null
          id: string
          label: string
          season_id: string
          starts_on: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_on: string
          finalized_at?: string | null
          id?: string
          label: string
          season_id: string
          starts_on: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_on?: string
          finalized_at?: string | null
          id?: string
          label?: string
          season_id?: string
          starts_on?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_weeks_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "current_season_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_weeks_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      job_runs: {
        Row: {
          attempt_count: number
          completed_at: string | null
          created_at: string
          deduplication_key: string
          error_message: string | null
          id: string
          job_type: string
          metadata: Json
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          deduplication_key: string
          error_message?: string | null
          id?: string
          job_type: string
          metadata?: Json
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          deduplication_key?: string
          error_message?: string | null
          id?: string
          job_type?: string
          metadata?: Json
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          is_admin: boolean
          last_name: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id: string
          is_admin?: boolean
          last_name?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          is_admin?: boolean
          last_name?: string | null
        }
        Relationships: []
      }
      score_events: {
        Row: {
          activity_id: string | null
          actor_id: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json
          points: number
          season_id: string
          source_submission_id: string | null
          team_id: string
          updated_at: string
          week_id: string
        }
        Insert: {
          activity_id?: string | null
          actor_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          points: number
          season_id: string
          source_submission_id?: string | null
          team_id: string
          updated_at?: string
          week_id: string
        }
        Update: {
          activity_id?: string | null
          actor_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          points?: number
          season_id?: string
          source_submission_id?: string | null
          team_id?: string
          updated_at?: string
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "score_events_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_events_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "current_activity_rules"
            referencedColumns: ["activity_id"]
          },
          {
            foreignKeyName: "score_events_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "current_season_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_events_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_events_source_submission_id_fkey"
            columns: ["source_submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "active_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_events_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "competition_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      scoring_rule_versions: {
        Row: {
          activity_id: string
          created_at: string
          created_by: string | null
          effective_from: string
          effective_to: string | null
          id: string
          points_per_unit: number
          season_id: string
          teammate_multiplier: number
          weekly_cap_points: number | null
        }
        Insert: {
          activity_id: string
          created_at?: string
          created_by?: string | null
          effective_from: string
          effective_to?: string | null
          id?: string
          points_per_unit: number
          season_id: string
          teammate_multiplier?: number
          weekly_cap_points?: number | null
        }
        Update: {
          activity_id?: string
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          points_per_unit?: number
          season_id?: string
          teammate_multiplier?: number
          weekly_cap_points?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scoring_rule_versions_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scoring_rule_versions_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "current_activity_rules"
            referencedColumns: ["activity_id"]
          },
          {
            foreignKeyName: "scoring_rule_versions_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "current_season_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scoring_rule_versions_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      season_tiers: {
        Row: {
          created_at: string
          season_id: string
          tier_key: string
          updated_at: string
          weekly_goal: number
        }
        Insert: {
          created_at?: string
          season_id: string
          tier_key: string
          updated_at?: string
          weekly_goal: number
        }
        Update: {
          created_at?: string
          season_id?: string
          tier_key?: string
          updated_at?: string
          weekly_goal?: number
        }
        Relationships: [
          {
            foreignKeyName: "season_tiers_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "current_season_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_tiers_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_tiers_tier_key_fkey"
            columns: ["tier_key"]
            isOneToOne: false
            referencedRelation: "tiers"
            referencedColumns: ["key"]
          },
        ]
      }
      seasons: {
        Row: {
          archived_at: string | null
          created_at: string
          daily_bonus_increment: number
          ends_on: string | null
          id: string
          max_streak_bonus: number
          name: string
          registration_open: boolean
          slug: string
          starts_on: string
          status: string
          submissions_open: boolean
          timezone: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          daily_bonus_increment?: number
          ends_on?: string | null
          id?: string
          max_streak_bonus?: number
          name: string
          registration_open?: boolean
          slug: string
          starts_on: string
          status?: string
          submissions_open?: boolean
          timezone?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          daily_bonus_increment?: number
          ends_on?: string | null
          id?: string
          max_streak_bonus?: number
          name?: string
          registration_open?: boolean
          slug?: string
          starts_on?: string
          status?: string
          submissions_open?: boolean
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      submission_attachments: {
        Row: {
          bucket_id: string
          created_at: string
          deleted_at: string | null
          id: string
          last_cleanup_error: string | null
          mime_type: string | null
          object_path: string
          purged_at: string | null
          size_bytes: number | null
          submission_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          bucket_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          last_cleanup_error?: string | null
          mime_type?: string | null
          object_path: string
          purged_at?: string | null
          size_bytes?: number | null
          submission_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          bucket_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          last_cleanup_error?: string | null
          mime_type?: string | null
          object_path?: string
          purged_at?: string | null
          size_bytes?: number | null
          submission_id?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submission_attachments_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_edit_requests: {
        Row: {
          created_at: string | null
          id: string
          reason: string
          request_type: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          submission_id: string
          suggested_changes: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reason: string
          request_type?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          submission_id: string
          suggested_changes?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reason?: string
          request_type?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          submission_id?: string
          suggested_changes?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_edit_requests_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          activity_date: string
          activity_id: string | null
          activity_key: string
          activity_value_bool: boolean | null
          activity_value_number: number | null
          activity_value_text: string | null
          base_points: number
          created_at: string
          did_with_teammate: boolean
          id: string
          multiplier: number
          points_awarded: number
          points_per_unit: number | null
          proof_image_path: string | null
          scoring_rule_version_id: string | null
          season_id: string
          streak_bonus: number | null
          submission_kind: string
          submitted_by: string | null
          submitted_by_name: string | null
          team_id: string
          teammate_bonus: number | null
          updated_at: string
          voided_at: string | null
          week_id: string
        }
        Insert: {
          activity_date?: string
          activity_id?: string | null
          activity_key: string
          activity_value_bool?: boolean | null
          activity_value_number?: number | null
          activity_value_text?: string | null
          base_points: number
          created_at?: string
          did_with_teammate?: boolean
          id?: string
          multiplier?: number
          points_awarded: number
          points_per_unit?: number | null
          proof_image_path?: string | null
          scoring_rule_version_id?: string | null
          season_id: string
          streak_bonus?: number | null
          submission_kind: string
          submitted_by?: string | null
          submitted_by_name?: string | null
          team_id: string
          teammate_bonus?: number | null
          updated_at?: string
          voided_at?: string | null
          week_id: string
        }
        Update: {
          activity_date?: string
          activity_id?: string | null
          activity_key?: string
          activity_value_bool?: boolean | null
          activity_value_number?: number | null
          activity_value_text?: string | null
          base_points?: number
          created_at?: string
          did_with_teammate?: boolean
          id?: string
          multiplier?: number
          points_awarded?: number
          points_per_unit?: number | null
          proof_image_path?: string | null
          scoring_rule_version_id?: string | null
          season_id?: string
          streak_bonus?: number | null
          submission_kind?: string
          submitted_by?: string | null
          submitted_by_name?: string | null
          team_id?: string
          teammate_bonus?: number | null
          updated_at?: string
          voided_at?: string | null
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "current_activity_rules"
            referencedColumns: ["activity_id"]
          },
          {
            foreignKeyName: "submissions_rule_version_id_fkey"
            columns: ["scoring_rule_version_id"]
            isOneToOne: false
            referencedRelation: "current_activity_rules"
            referencedColumns: ["scoring_rule_version_id"]
          },
          {
            foreignKeyName: "submissions_rule_version_id_fkey"
            columns: ["scoring_rule_version_id"]
            isOneToOne: false
            referencedRelation: "scoring_rule_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "current_season_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "active_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "competition_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      team_memberships: {
        Row: {
          created_at: string
          display_name_snapshot: string
          id: string
          joined_at: string
          left_at: string | null
          role: string
          season_id: string
          team_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          display_name_snapshot: string
          id?: string
          joined_at?: string
          left_at?: string | null
          role?: string
          season_id: string
          team_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          display_name_snapshot?: string
          id?: string
          joined_at?: string
          left_at?: string | null
          role?: string
          season_id?: string
          team_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_memberships_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "current_season_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_memberships_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "active_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_streaks: {
        Row: {
          last_activity_date: string | null
          streak_count: number
          team_id: string
          updated_at: string
        }
        Insert: {
          last_activity_date?: string | null
          streak_count?: number
          team_id: string
          updated_at?: string
        }
        Update: {
          last_activity_date?: string | null
          streak_count?: number
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_streaks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "active_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_streaks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "team_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_streaks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_week_results: {
        Row: {
          created_at: string
          finalized_at: string
          goal_points: number
          id: string
          points: number
          rank: number
          season_id: string
          streak_count: number
          team_id: string
          tier_key: string
          updated_at: string
          week_id: string
          won: boolean
        }
        Insert: {
          created_at?: string
          finalized_at?: string
          goal_points: number
          id?: string
          points: number
          rank: number
          season_id: string
          streak_count?: number
          team_id: string
          tier_key: string
          updated_at?: string
          week_id: string
          won?: boolean
        }
        Update: {
          created_at?: string
          finalized_at?: string
          goal_points?: number
          id?: string
          points?: number
          rank?: number
          season_id?: string
          streak_count?: number
          team_id?: string
          tier_key?: string
          updated_at?: string
          week_id?: string
          won?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "team_week_results_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "current_season_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_week_results_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_week_results_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "active_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_week_results_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_week_results_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_week_results_tier_key_fkey"
            columns: ["tier_key"]
            isOneToOne: false
            referencedRelation: "tiers"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "team_week_results_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "competition_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          invite_code: string | null
          name: string
          season_id: string
          tier: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          invite_code?: string | null
          name: string
          season_id: string
          tier?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          invite_code?: string | null
          name?: string
          season_id?: string
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "current_season_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_tier_key_fkey"
            columns: ["tier"]
            isOneToOne: false
            referencedRelation: "tiers"
            referencedColumns: ["key"]
          },
        ]
      }
      tiers: {
        Row: {
          active: boolean
          created_at: string
          key: string
          name: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          key: string
          name: string
          sort_order: number
        }
        Update: {
          active?: boolean
          created_at?: string
          key?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
    }
    Views: {
      active_team_rosters: {
        Row: {
          display_name: string | null
          joined_at: string | null
          membership_id: string | null
          role: string | null
          season_id: string | null
          team_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_memberships_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "current_season_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_memberships_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "active_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      active_teams: {
        Row: {
          created_at: string | null
          id: string | null
          last_activity_date: string | null
          name: string | null
          season_id: string | null
          streak_count: number | null
          tier: string | null
          total_points: number | null
          weekly_points: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "current_season_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_tier_key_fkey"
            columns: ["tier"]
            isOneToOne: false
            referencedRelation: "tiers"
            referencedColumns: ["key"]
          },
        ]
      }
      current_activity_rules: {
        Row: {
          active: boolean | null
          activity_id: string | null
          activity_key: string | null
          description: string | null
          input_type: string | null
          label: string | null
          min_value: number | null
          points_per_unit: number | null
          scoring_rule_version_id: string | null
          season_id: string | null
          step_value: number | null
          teammate_bonus: number | null
          unit: string | null
          unit_label: string | null
          updated_at: string | null
          weekly_cap: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scoring_rule_versions_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "current_season_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scoring_rule_versions_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      current_season_settings: {
        Row: {
          created_at: string | null
          daily_bonus_increment: number | null
          ends_on: string | null
          id: string | null
          max_streak_bonus: number | null
          name: string | null
          registration_open: boolean | null
          slug: string | null
          starts_on: string | null
          status: string | null
          submissions_open: boolean | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          daily_bonus_increment?: number | null
          ends_on?: string | null
          id?: string | null
          max_streak_bonus?: number | null
          name?: string | null
          registration_open?: boolean | null
          slug?: string | null
          starts_on?: string | null
          status?: string | null
          submissions_open?: boolean | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          daily_bonus_increment?: number | null
          ends_on?: string | null
          id?: string | null
          max_streak_bonus?: number | null
          name?: string | null
          registration_open?: boolean | null
          slug?: string | null
          starts_on?: string | null
          status?: string | null
          submissions_open?: boolean | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      current_tier_settings: {
        Row: {
          created_at: string | null
          season_id: string | null
          tier: string | null
          updated_at: string | null
          weekly_goal: number | null
        }
        Insert: {
          created_at?: string | null
          season_id?: string | null
          tier?: string | null
          updated_at?: string | null
          weekly_goal?: number | null
        }
        Update: {
          created_at?: string | null
          season_id?: string | null
          tier?: string | null
          updated_at?: string | null
          weekly_goal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "season_tiers_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "current_season_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_tiers_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_tiers_tier_key_fkey"
            columns: ["tier"]
            isOneToOne: false
            referencedRelation: "tiers"
            referencedColumns: ["key"]
          },
        ]
      }
      team_standings: {
        Row: {
          archived_at: string | null
          created_at: string | null
          id: string | null
          last_activity_date: string | null
          name: string | null
          season_id: string | null
          season_points: number | null
          streak_count: number | null
          tier: string | null
          weekly_points: number | null
          weeks_won_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "current_season_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_tier_key_fkey"
            columns: ["tier"]
            isOneToOne: false
            referencedRelation: "tiers"
            referencedColumns: ["key"]
          },
        ]
      }
    }
    Functions: {
      admin_update_submission_v2: {
        Args: {
          p_activity_date: string
          p_activity_key: string
          p_did_with_teammate: boolean
          p_submission_id: string
          p_team_id: string
          p_value_bool?: boolean
          p_value_number?: number
          p_value_text?: string
        }
        Returns: undefined
      }
      archive_activity_v2: {
        Args: { p_activity_key: string }
        Returns: undefined
      }
      archive_team_v2: { Args: { p_team_id: string }; Returns: undefined }
      assert_admin: { Args: never; Returns: undefined }
      change_team_tier_v2: {
        Args: { p_team_id: string; p_tier_key: string }
        Returns: undefined
      }
      create_activity_submission_v2: {
        Args: {
          p_activity_date: string
          p_activity_key: string
          p_did_with_teammate: boolean
          p_proof_mime?: string
          p_proof_path?: string
          p_proof_size?: number
          p_team_id: string
          p_value_bool?: boolean
          p_value_number?: number
          p_value_text?: string
        }
        Returns: Json
      }
      create_team_v2: {
        Args: { p_name: string; p_tier_key: string }
        Returns: {
          invite_code: string
          team_id: string
        }[]
      }
      current_season_id: { Args: never; Returns: string }
      current_week_start_date: { Args: never; Returns: string }
      ensure_competition_week: {
        Args: { p_activity_date: string; p_season_id: string }
        Returns: string
      }
      finalize_competition_week: { Args: { p_week_id?: string }; Returns: Json }
      finalize_week: { Args: { p_week_start: string }; Returns: undefined }
      get_all_user_emails: {
        Args: never
        Returns: {
          email: string
        }[]
      }
      get_my_team_v2: { Args: never; Returns: Json }
      is_admin: { Args: { uid: string }; Returns: boolean }
      is_in_current_week: { Args: { d: string }; Returns: boolean }
      join_team_by_code_v2: { Args: { p_code: string }; Returns: string }
      leave_team_v2: { Args: { p_team_id: string }; Returns: undefined }
      parse_week_end: { Args: { p_label: string }; Returns: string }
      parse_week_start: { Args: { p_label: string }; Returns: string }
      rename_team_v2: {
        Args: { p_new_name: string; p_team_id: string }
        Returns: undefined
      }
      request_submission_edit_v2: {
        Args: {
          p_reason: string
          p_submission_id: string
          p_suggested_changes: Json
        }
        Returns: string
      }
      resolve_submission_edit_request_v2: {
        Args: {
          p_request_id: string
          p_resolution_note?: string
          p_status: string
        }
        Returns: undefined
      }
      save_activity_rule_v2: {
        Args: {
          p_activity_key: string
          p_description: string
          p_label: string
          p_measurement_type: string
          p_min_value: number
          p_points_per_unit: number
          p_step_value: number
          p_teammate_multiplier: number
          p_unit_label: string
          p_weekly_cap_points: number
        }
        Returns: string
      }
      save_activity_rules_bulk_v2: {
        Args: { p_rules: Json }
        Returns: undefined
      }
      set_season_controls_v2: {
        Args: {
          p_registration_open?: boolean
          p_status?: string
          p_submissions_open?: boolean
        }
        Returns: Json
      }
      start_new_season_v2: {
        Args: { p_name: string; p_starts_on?: string }
        Returns: string
      }
      update_streak_settings_v2: {
        Args: { p_daily_bonus_increment: number; p_max_streak_bonus: number }
        Returns: undefined
      }
      update_tier_goals_v2: {
        Args: { p_gold: number; p_purple: number; p_red: number }
        Returns: undefined
      }
      void_submission_v2: { Args: { p_submission_id: string }; Returns: string }
      week_identifier: { Args: { p_monday: string }; Returns: string }
      week_start: { Args: { d: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
