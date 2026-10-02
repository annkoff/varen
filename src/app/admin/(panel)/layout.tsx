import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { logout } from "../login/actions";

export const metadata: Metadata = {
  title: { default: "Админ-панель", template: "%s — Админ VAREN" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const newLeads = await db.lead.count({ where: { status: "NEW" } });
  return (
    <div className="min-h-[100svh]">
      <AdminNav email={admin.email} newLeads={newLeads} logout={logout} />
      <main className="px-4 py-6 md:px-8 md:py-10 lg:ml-60">{children}</main>
    </div>
  );
}
