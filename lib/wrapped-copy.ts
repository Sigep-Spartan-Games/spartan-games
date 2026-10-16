import {
  contributionRankCallouts,
  selectStableWrappedCopy,
  titleCaseTier,
  type WrappedReady,
} from "@/lib/wrapped";

export type WrappedSlideCopy = {
  title: string;
  subtitle: string;
};

export type WrappedStoryCopy = Record<
  | "cover"
  | "contribution"
  | "favorite"
  | "consistency"
  | "teamwork"
  | "teamResult"
  | "highlights"
  | "summary"
  | "finale",
  WrappedSlideCopy
>;

function pick(
  data: WrappedReady,
  slideState: string,
  options: readonly WrappedSlideCopy[],
) {
  return selectStableWrappedCopy(
    data.season.id,
    data.player.id,
    slideState,
    options,
  );
}

export function getWrappedStoryCopy(data: WrappedReady): WrappedStoryCopy {
  const player = data.player.name;
  const team = data.team.name;
  const tier = titleCaseTier(data.team.tier);
  const hasTopTenRank = contributionRankCallouts(data.personal).length > 0;
  const hasPersonalStreak = data.personal.longest_active_day_run >= 2;
  const hasTeamwork = data.personal.teammate_activities > 0;

  const cover = data.team.is_champion
    ? pick(data, "cover:champion", [
        { title: `${player}, this was a season to remember.`, subtitle: "Your personal story and your team's complete journey." },
        { title: `${player}, your season ended on a high.`, subtitle: "The numbers behind your contribution and a standout finish." },
        { title: `${player}, welcome back to a special season.`, subtitle: "Your Spartan Games story, from first submission to finale." },
      ])
    : pick(data, "cover:standard", [
        { title: `${player}, this was your season.`, subtitle: "Your personal effort and your team's complete journey." },
        { title: `${player}, every submission built this story.`, subtitle: "A season of individual effort and team progress." },
        { title: `${player}, your season is ready to replay.`, subtitle: "Your strongest moments, favorite activity, and team finish." },
      ]);

  const contribution = hasTopTenRank
    ? pick(data, "contribution:top-ten", [
        { title: "These points were your individual contribution.", subtitle: "Your effort also earned a top-ten contributor finish." },
        { title: "Your individual contribution stood out.", subtitle: "You finished among the season's leading contributors." },
        { title: "You put top-ten points on the board.", subtitle: "Every point here came from your individual contribution." },
      ])
    : pick(data, "contribution:standard", [
        { title: "These points were your individual contribution.", subtitle: "This is the part of the team total that came from you." },
        { title: "Your effort added to the final score.", subtitle: "These are the points you personally contributed." },
        { title: "You put these points on the board.", subtitle: "Your individual contribution became part of the team's finish." },
      ]);

  const favorite = pick(data, "favorite:standard", [
    { title: "Your favorite activity took the lead.", subtitle: "This was the activity you submitted most often." },
    { title: "One activity became your signature.", subtitle: "It led your season by submission count." },
    { title: "You kept coming back to this activity.", subtitle: "Your most frequently submitted activity of the season." },
  ]);

  const consistency = hasPersonalStreak
    ? pick(data, "consistency:streak", [
        { title: "You built a personal streak.", subtitle: "Your submissions connected across days and weeks." },
        { title: "Consistency became part of your season.", subtitle: "Your longest activity streak shows the rhythm you built." },
        { title: "You kept the momentum going.", subtitle: "A personal activity streak anchored your season." },
      ])
    : pick(data, "consistency:standard", [
        { title: "You kept showing up.", subtitle: "Your submissions, active weeks, and best moments tell the story." },
        { title: "Your season had its own rhythm.", subtitle: "Here is when your individual effort was strongest." },
        { title: "Every check-in added up.", subtitle: "Your personal consistency, from submissions to best week." },
      ]);

  const teamwork = hasTeamwork
    ? pick(data, "teamwork:active", [
        { title: "You made teamwork count.", subtitle: "Teammate submissions added extra energy to your personal season." },
        { title: "Some efforts were better together.", subtitle: "Your teammate submissions earned bonus points along the way." },
        { title: "You teamed up and earned more.", subtitle: "These are your own teammate submissions and bonus points." },
      ])
    : pick(data, "teamwork:solo", [
        { title: "Your points came from your own pace.", subtitle: "No teammate submissions were recorded for you this season." },
        { title: "You carried your personal effort solo.", subtitle: "Your season did not include a teammate submission." },
        { title: "This season was an individual run.", subtitle: "There were no teammate submissions in your personal record." },
      ]);

  const teamResult = data.team.is_champion
    ? pick(data, "team-result:champion", [
        { title: `${team} are ${tier} tier champions.`, subtitle: "The team's final result, from points to weekly wins." },
        { title: `${team} finished as ${tier} tier champions.`, subtitle: "A title built through the team's complete season." },
        { title: `${tier} tier champions: ${team}.`, subtitle: "The final team numbers behind the championship." },
      ])
    : data.team.tier_rank
      ? pick(data, "team-result:ranked", [
          { title: `${team} finished #${data.team.tier_rank} in the ${tier} tier.`, subtitle: "The team's final points, wins, goals, and scoring streak." },
          { title: `#${data.team.tier_rank} in the ${tier} tier for ${team}.`, subtitle: "A complete look at the team's season result." },
          { title: `${team} earned the #${data.team.tier_rank} spot in the ${tier} tier.`, subtitle: "The team result behind that placement." },
        ])
      : pick(data, "team-result:standard", [
          { title: `${team} represented the ${tier} tier.`, subtitle: "The team's final season result in one view." },
          { title: `${team} completed a ${tier} tier season.`, subtitle: "Team points, weekly wins, goals, and scoring streak." },
          { title: `${team} closed out the ${tier} tier campaign.`, subtitle: "Here is how the team finished." },
        ]);

  const highlights = data.team.best_comeback
    ? pick(data, "highlights:comeback", [
        { title: "The team found another gear.", subtitle: "A favorite activity, a best week, and the season's biggest climb." },
        { title: "The comeback became a team highlight.", subtitle: "These moments defined the team's journey." },
        { title: "The team's biggest climb left a mark.", subtitle: "A closer look at the activities and week behind it." },
      ])
    : pick(data, "highlights:standard", [
        { title: "These moments defined the team.", subtitle: "The team's favorite activity and strongest week." },
        { title: "The team's season had clear highlights.", subtitle: "A look at the activity and week that led the way." },
        { title: "This is where the team shined.", subtitle: "The favorite activity and best week from the season." },
      ]);

  const summary = pick(data, "summary:standard", [
    { title: "Your season, all in one place.", subtitle: "The key personal and team statistics from this Wrapped." },
    { title: "The complete season stat sheet.", subtitle: "Your individual numbers first, followed by the team's result." },
    { title: "One last look at the numbers.", subtitle: "A compact recap of your season and the team's season." },
  ]);

  const finale = data.team.is_champion
    ? pick(data, "finale:champion", [
        { title: `${player}, you answered the challenge.`, subtitle: `${data.season.name} is in the books.` },
        { title: `${player}, you helped build a season worth celebrating.`, subtitle: "Every submission is now part of the final record." },
        { title: `${player}, remember this run.`, subtitle: `You finished it alongside ${team}.` },
      ])
    : pick(data, "finale:standard", [
        { title: `${player}, you answered the challenge.`, subtitle: `${data.season.name} is in the books.` },
        { title: `${player}, that was your Spartan Games season.`, subtitle: "Your effort is now part of the final record." },
        { title: `${player}, your season story is complete.`, subtitle: `You finished it alongside ${team}.` },
      ]);

  return {
    cover,
    contribution,
    favorite,
    consistency,
    teamwork,
    teamResult,
    highlights,
    summary,
    finale,
  };
}
