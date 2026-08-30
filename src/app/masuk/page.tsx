import type { Metadata } from "next";

import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Masuk BEM",
};

export default function MasukPage() {
  redirect("/admin/login");
}
