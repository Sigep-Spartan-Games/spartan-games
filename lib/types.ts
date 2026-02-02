export type ActivityRule = {
    activity_key: string;
    points_per_unit: number;
    teammate_bonus: number;
    updated_at: string;
    unit: string | null;
    label: string | null;
    input_type: "number" | "text" | "boolean" | null;
    unit_label: string | null;
    min_value: number | null;
    step_value: number | null;
    active: boolean;
};

export type Team = {
    id: string;
    name: string;
    weekly_points: number;
    total_points: number;
    weeks_won: string[]; // dates as strings
    created_at: string;
    // member1_id, member2_id are also there but maybe not needed for general UI yet
};

export type GameSettings = {
    id: boolean;
    registration_open: boolean;
    submissions_open: boolean;
    games_started_at: string | null;
    games_ended_at: string | null;
    finalize_requested: boolean;
    last_week_finalized: string | null; // date
};

export type Submission = {
    id: string;
    team_id: string;
    submitted_by: string;
    activity: string;
    base_points: number;
    did_with_teammate: boolean;
    multiplier: number;
    points_awarded: number;
    inserted_at: string;
    activity_key: string;
    activity_date: string; // date
    activity_units: number | null;
    points_per_unit: number | null;
    teammate_bonus: number | null;
    activity_value_number: number | null;
    activity_value_text: string | null;
    activity_value_bool: boolean | null;
};
