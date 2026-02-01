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
