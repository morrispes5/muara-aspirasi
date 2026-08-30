import type { ReactNode } from "react";

import {
  AuthorizationError,
  requireBemPermission,
} from "@/server/auth/session";
import { AdminShell } from "@/components/admin/admin-shell";
import { hasPermission } from "@/server/auth/roles";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type AdminProtectedLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default async function AdminProtectedLayout({
  children,
}: AdminProtectedLayoutProps) {
  let session;

  try {
    session = await requireBemPermission("VIEW_ADMIN_DASHBOARD");
  } catch (error) {
    if (error instanceof AuthorizationError && error.statusCode === 401) {
      redirect("/admin/login?next=%2Fadmin");
    }

    throw error;
  }

  return (
    <AdminShell
      user={{
        canViewReports: hasPermission(session.user.role, "VIEW_REPORTS"),
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
      }}
    >
      {children}
    </AdminShell>
  );
}
