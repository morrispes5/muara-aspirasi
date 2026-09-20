import { resolveDeployEnvironment } from "@/server/config/deploy-environment";

/** Server-only policy. Never return the configured address to the browser. */
export function isOwnerEmailAllowed(email: unknown) {
  const owner = process.env.BEM_OWNER_EMAIL?.trim().toLowerCase();
  if (!owner) {
    return (
      resolveDeployEnvironment(process.env.DATABASE_ENVIRONMENT) ===
      "development"
    );
  }
  return typeof email === "string" && email.trim().toLowerCase() === owner;
}
