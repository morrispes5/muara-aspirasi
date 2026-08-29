import { pgEnum } from "drizzle-orm/pg-core";

export const bemUserRoleEnum = pgEnum("bem_user_role", [
  "EDITOR",
  "ADVOCATE",
  "ADMIN",
]);

export const bemUserStatusEnum = pgEnum("bem_user_status", [
  "ACTIVE",
  "SUSPENDED",
]);

export const identityModeEnum = pgEnum("identity_mode", [
  "CONFIDENTIAL_BEM_ONLY",
  "CONSENTED_LIMITED_SHARE",
]);

export const identityShareScopeEnum = pgEnum("identity_share_scope", [
  "BEM_ONLY",
  "LIMITED_DESTINATION_UNIT",
]);

export const reportStatusEnum = pgEnum("report_status", [
  "RECEIVED",
  "UNDER_REVIEW",
  "NEEDS_CLARIFICATION",
  "IN_COORDINATION",
  "UPDATE_AVAILABLE",
  "ACTION_TAKEN",
  "RESOLVED",
  "CANNOT_PROCESS",
]);

export const reportUrgencyEnum = pgEnum("report_urgency", [
  "LOW",
  "NORMAL",
  "HIGH",
  "ESCALATE",
]);

export const evidenceValidationStatusEnum = pgEnum(
  "evidence_validation_status",
  ["PENDING", "ACCEPTED", "REJECTED", "QUARANTINED"],
);

export const auditActorTypeEnum = pgEnum("audit_actor_type", [
  "SYSTEM",
  "PUBLIC",
  "BEM_USER",
]);

export const auditResultEnum = pgEnum("audit_result", [
  "SUCCESS",
  "DENIED",
  "FAILED",
]);

export const advocacyPublicationStatusEnum = pgEnum(
  "advocacy_publication_status",
  ["DRAFT", "IN_REVIEW", "PUBLISHED", "ARCHIVED"],
);

export const studentInfoCategoryEnum = pgEnum("student_info_category", [
  "ACADEMIC",
  "FACILITIES",
  "OPPORTUNITY",
  "EVENT",
  "SERVICE",
  "ANNOUNCEMENT",
]);

export const studentInfoPublicationStatusEnum = pgEnum(
  "student_info_publication_status",
  ["DRAFT", "IN_REVIEW", "SCHEDULED", "PUBLISHED", "ARCHIVED"],
);
