"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { NAV_LINKS } from "@/content/site";

export function Header({ phone, phoneHref }: { phone: string; phoneHref: string }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu on navigation.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const solid = scrolled || open;

  return (
    <>
      <header
        className={clsx(
          "fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500",
          solid ? "border-b border-line bg-ink/90 backdrop-blur-md" : "border-b border-transparent bg-gradient-to-b from-ink/60 to-transparent"
        )}
      >
        <div className="container-x flex h-[72px] items-center justify-between gap-6 md:h-20">
          <Link href="/" aria-label="VAREN — на главную" className="relative z-10 text-paper">
            <Logo className="h-[17px] md:h-[19px]" />
          </Link>

          <nav aria-label="Основная навигация" className="hidden lg:block">
            <ul className="flex items-center gap-9">
              {NAV_LINKS.map((l) => {
                const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
                return (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className={clsx("link-underline text-[13px] tracking-[0.06em] transition-colors", active ? "text-paper" : "text-paper/65 hover:text-paper")}
                      aria-current={active ? "page" : undefined}
                    >
                      {l.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-5">
            <a href={`tel:${phoneHref}`} className="hidden text-[13px] tracking-[0.04em] text-paper/80 hover:text-paper xl:block">
              {phone}
            </a>
            <Link href="/request" data-cta="header_request" className="btn btn-outline btn-sm hidden sm:inline-flex">
              Оставить заявку
            </Link>
            <button
              type="button"
              className="relative z-10 -mr-2 flex h-11 w-11 items-center justify-center lg:hidden"
              aria-label={open ? "Закрыть меню" : "Открыть меню"}
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen((v) => !v)}
            >
              <span className="relative block h-3 w-6">
                <span className={clsx("absolute left-0 h-px w-6 bg-paper transition-all duration-500", open ? "top-1.5 rotate-45" : "top-0")} />
                <span className={clsx("absolute left-0 h-px w-6 bg-paper transition-all duration-500", open ? "top-1.5 -rotate-45" : "top-3")} />
              </span>
            </button>
          </div>
        </div>
      </header>

      <div
        id="mobile-menu"
        className={clsx(
          "fixed inset-0 z-40 flex flex-col bg-ink pt-[72px] transition-[opacity,visibility] duration-500 lg:hidden",
          open ? "visible opacity-100" : "invisible opacity-0"
        )}
        aria-hidden={!open}
      >
        <nav aria-label="Мобильная навигация" className="container-x flex flex-1 flex-col justify-between overflow-y-auto pb-10 pt-8">
          <ul className="flex flex-col">
            {[{ href: "/", label: "Главная" }, ...NAV_LINKS].map((l, i) => (
              <li key={l.href} className="border-b border-line">
                <Link
                  href={l.href}
                  tabIndex={open ? 0 : -1}
                  className="flex items-baseline justify-between py-4 text-[clamp(1.6rem,7vw,2.4rem)] font-light tracking-tight"
                >
                  {l.label}
                  <span className="text-xs text-dim">{String(i + 1).padStart(2, "0")}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-col gap-4">
            <Link href="/request" data-cta="mobile_menu_request" tabIndex={open ? 0 : -1} className="btn btn-primary w-full">
              Оставить заявку
            </Link>
            <a href={`tel:${phoneHref}`} tabIndex={open ? 0 : -1} className="btn btn-outline w-full">
              {phone}
            </a>
          </div>
        </nav>
      </div>
    </>
  );
}
