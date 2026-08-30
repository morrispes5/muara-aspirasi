const defaultAdminPath = "/admin";

export function getSafeAdminRedirectPath(
  value: string | string[] | null | undefined,
): string {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (
    !candidate ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    !(candidate === "/admin" || candidate.startsWith("/admin/"))
  ) {
    return defaultAdminPath;
  }

  return candidate;
}
