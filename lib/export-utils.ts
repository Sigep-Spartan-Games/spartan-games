import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

export const EXPORT_PAGE_SIZE = 1000;

type QueryError = { message: string };
type PageResult<T> = { data: T[] | null; error: QueryError | null };

export type ExportScope = "current" | "all";

export type ExportSeason = {
  id: string;
  name: string;
  status: string;
  starts_on: string;
  ends_on: string | null;
};

export class ExportError extends Error {}
export class ExportRequestError extends ExportError {}

export async function fetchAllExportRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await fetchPage(from, from + EXPORT_PAGE_SIZE - 1);
    if (error) throw new ExportError(error.message);

    const page = data ?? [];
    rows.push(...page);
    if (page.length < EXPORT_PAGE_SIZE) break;
    from += page.length;
  }

  return rows;
}

export function parseExportScope(request: Request): ExportScope {
  const value = new URL(request.url).searchParams.get("scope") ?? "current";
  if (value !== "current" && value !== "all") {
    throw new ExportRequestError("Export scope must be current or all.");
  }
  return value;
}

export async function resolveExportSeasons(
  supabase: SupabaseClient<Database>,
  scope: ExportScope,
): Promise<ExportSeason[]> {
  if (scope === "current") {
    const { data, error } = await supabase
      .from("current_season_settings")
      .select("id,name,status,starts_on,ends_on")
      .maybeSingle();
    if (error) throw new ExportError(error.message);
    if (!data?.id || !data.name || !data.status || !data.starts_on) {
      throw new ExportError("No current season is configured.");
    }
    return [{
      id: data.id,
      name: data.name,
      status: data.status,
      starts_on: data.starts_on,
      ends_on: data.ends_on,
    }];
  }

  return fetchAllExportRows<ExportSeason>((from, to) =>
    supabase
      .from("seasons")
      .select("id,name,status,starts_on,ends_on")
      .order("starts_on", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to),
  );
}

export function csvEscape(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[\t\r ]*[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers: string[], rows: Record<string, unknown>[]): string {
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\n");
}

export function exportFilename(base: string, scope: ExportScope, extension: string) {
  const suffix = scope === "all" ? "-all-seasons" : "-current-season";
  return `${base}${suffix}.${extension}`;
}
