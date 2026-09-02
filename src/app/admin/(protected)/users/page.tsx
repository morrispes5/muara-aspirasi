import type { Metadata } from "next";

import { AdminUsers } from "@/components/admin/admin-users";
import { listBemUsers } from "@/server/auth/user-management";
import { requireBemPermission } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kelola Akun BEM",
  description: "Manajemen akses internal BEM secara tertutup dan teraudit.",
};

export default async function AdminUsersPage() {
  const session = await requireBemPermission("MANAGE_USERS");
  const users = await listBemUsers(session.user.id);

  return (
    <AdminUsers
      initialUsers={users.map((user) => ({
        ...user,
        createdAt: user.createdAt.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      }))}
    />
  );
}
