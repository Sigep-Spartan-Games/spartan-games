require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  const { data, error } = await supabase.from("weekly_history").select(`
            id,
            week_identifier,
            weekly_points,
            tier,
            weekly_goal,
            met_goal,
            weeks_won_count,
            streak_count,
            created_at,
            team_id,
            teams ( name )
        `);

  if (error) {
    fs.writeFileSync("data.json", JSON.stringify({ error }));
  } else {
    fs.writeFileSync(
      "data.json",
      JSON.stringify(
        { length: data.length, first: data[0], all: data },
        null,
        2,
      ),
    );
  }
}

checkData();
