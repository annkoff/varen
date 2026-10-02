"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/brand/logo";

const LINKS = [
  { href: "/admin", label: "Дашборд" },
  { href: "/admin/leads", label: "Заявки" },
  { href: "/admin/projects", label: "Проекты" },
  { href: "/admin/reviews", label: "Отзывы" },
  { href: "/admin/referrals", label: "Реферальные ссылки" },
  { href: "/admin/analytics", label: "Аналитика" },
  { href: "/admin/settings", label: "Настройки" },
];

export function AdminNav({ email, newLeads, logout }: { email: string; newLeads: number; logout: () => Promise<void> }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const list = (
    <ul className="space-y-0.5">
      {LINKS.map((l) => (
        <li key={l.href}>
          <Link
            href={l.href}
            onClick={() => setOpen(false)}
            className={clsx("flex items-center justify-between px-3 py-2.5 text-sm transition-colors", isActive(l.href) ? "bg-ink-3 text-paper" : "text-paper/65 hover:bg-ink-3/60 hover:text-paper")}
            aria-current={isActive(l.href) ? "page" : undefined}
          >
            {l.label}
            {l.href === "/admin/leads" && newLeads > 0 && <span className="min-w-6 bg-sand px-1.5 text-center text-[11px] text-ink">{newLeads}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );

  const footer = (
    <div className="space-y-3 border-t border-line pt-4 text-xs text-mute">
      <p className="truncate" title={email}>
        {email}
      </p>
      <div className="flex gap-4">
        <Link href="/" target="_blank" className="hover:text-paper">
          Открыть сайт ↗
        </Link>
        <form action={logout}>
          <button type="submit" className="hover:text-paper">
            Выйти
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col justify-between border-r border-line bg-ink p-4 lg:flex">
        <div>
          <Link href="/admin" className="mb-8 block px-3 pt-2">
            <Logo className="h-4" />
            <span className="mt-2 block text-[10px] tracking-[0.2em] text-mute uppercase">Admin</span>
          </Link>
          <nav aria-label="Админ-навигация">{list}</nav>
        </div>
        {footer}
      </aside>

      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-ink/95 px-4 backdrop-blur lg:hidden">
        <Link href="/admin" className="flex items-center gap-3">
          <Logo className="h-3.5" />
          <span className="text-[10px] tracking-[0.2em] text-mute uppercase">Admin</span>
        </Link>
        <button type="button" onClick={() => setOpen((v) => !v)} className="btn btn-outline btn-sm" aria-expanded={open}>
          {open ? "Закрыть" : "Меню"}
          {!open && newLeads > 0 && <span className="bg-sand px-1.5 text-[10px] text-ink">{newLeads}</span>}
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 top-14 z-30 flex flex-col justify-between overflow-y-auto bg-ink p-4 lg:hidden">
          <nav aria-label="Админ-навигация">{list}</nav>
          {footer}
        </div>
      )}
    </>
  );
}
