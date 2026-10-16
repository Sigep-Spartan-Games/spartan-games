import "server-only";

export function isWrappedEnabled() {
  return process.env.WRAPPED_ENABLED === "true";
}
