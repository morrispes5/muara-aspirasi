export const bemRoles = ["EDITOR", "ADVOCATE", "ADMIN"] as const;

export type BemRole = (typeof bemRoles)[number];

export const bemPermissions = [
  "VIEW_ADMIN_DASHBOARD",
  "DRAFT_STUDENT_INFO",
  "DRAFT_ADVOCACY_UPDATE",
  "VIEW_REPORTS",
  "VIEW_CONFIDENTIAL_REPORT",
  "PROCESS_REPORT",
  "ARCHIVE_REPORT",
  "REOPEN_REPORT",
  "APPROVE_PUBLICATION",
  "MANAGE_USERS",
  "VIEW_AUDIT",
] as const;

export type BemPermission = (typeof bemPermissions)[number];

const permissionsByRole: Record<BemRole, ReadonlySet<BemPermission>> = {
  EDITOR: new Set(["VIEW_ADMIN_DASHBOARD", "DRAFT_STUDENT_INFO"]),
  ADVOCATE: new Set([
    "VIEW_ADMIN_DASHBOARD",
    "DRAFT_STUDENT_INFO",
    "DRAFT_ADVOCACY_UPDATE",
    "VIEW_REPORTS",
    "VIEW_CONFIDENTIAL_REPORT",
    "PROCESS_REPORT",
  ]),
  ADMIN: new Set(bemPermissions),
};

export const roleLabels: Record<BemRole, string> = {
  EDITOR: "Editor",
  ADVOCATE: "Advocate",
  ADMIN: "Admin",
};

export function isBemRole(value: unknown): value is BemRole {
  return typeof value === "string" && bemRoles.includes(value as BemRole);
}

export function hasPermission(
  role: unknown,
  permission: BemPermission,
): boolean {
  return isBemRole(role) && permissionsByRole[role].has(permission);
}

export function permissionsForRole(role: BemRole): BemPermission[] {
  return bemPermissions.filter((permission) =>
    permissionsByRole[role].has(permission),
  );
}
