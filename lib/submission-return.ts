const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function sanitizeSubmissionListQuery(value: string | null | undefined) {
  const input = new URLSearchParams(value ?? "");
  const output = new URLSearchParams();

  const team = input.get("team");
  const season = input.get("season");
  const date = input.get("date");
  const status = input.get("status");
  const page = Number.parseInt(input.get("page") ?? "", 10);

  if (team && UUID_PATTERN.test(team)) output.set("team", team);
  if (season && UUID_PATTERN.test(season)) output.set("season", season);
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) output.set("date", date);
  if (status === "active" || status === "voided") output.set("status", status);
  if (Number.isFinite(page) && page > 1) output.set("page", String(page));

  return output.toString();
}

export function submissionListUrl(value: string | null | undefined) {
  const query = sanitizeSubmissionListQuery(value);
  return query ? `/admin/submissions?${query}` : "/admin/submissions";
}
