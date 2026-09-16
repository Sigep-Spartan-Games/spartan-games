export function safeSameOriginPath(
  candidate: string | null | undefined,
  origin: string,
  fallback = "/",
) {
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return fallback;
  }

  try {
    const target = new URL(candidate, origin);
    if (target.origin !== origin) return fallback;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return fallback;
  }
}
