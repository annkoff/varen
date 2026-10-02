import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { NAV_LINKS, FOUNDED_YEAR, type Contacts } from "@/content/site";
import { SERVICES } from "@/content/services";

export function Footer({ contacts }: { contacts: Contacts }) {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-line bg-ink">
      <div className="container-x py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Logo className="h-5 text-paper" />
            <p className="mt-6 max-w-xs text-sm leading-relaxed text-mute">
              Строим частные дома, делаем отделку и благоустройство с {FOUNDED_YEAR} года. Работаем по всей России.
            </p>
          </div>
          <div className="lg:col-span-2">
            <p className="eyebrow mb-5">Разделы</p>
            <ul className="space-y-3 text-sm">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-paper/70 hover:text-paper">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-3">
            <p className="eyebrow mb-5">Услуги</p>
            <ul className="space-y-3 text-sm">
              {SERVICES.map((s) => (
                <li key={s.slug}>
                  <Link href={`/services/${s.slug}`} className="text-paper/70 hover:text-paper">
                    {s.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-3">
            <p className="eyebrow mb-5">Контакты</p>
            <ul className="space-y-3 text-sm text-paper/70">
              <li>
                <a href={`tel:${contacts.phoneHref}`} className="text-paper hover:text-sand-2">
                  {contacts.phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${contacts.email}`} className="hover:text-paper">
                  {contacts.email}
                </a>
              </li>
              <li>{contacts.address}</li>
              <li>{contacts.hours}</li>
            </ul>
          </div>
        </div>
        <div className="mt-16 flex flex-col gap-4 border-t border-line pt-8 text-xs text-dim md:flex-row md:items-center md:justify-between">
          <p>© {FOUNDED_YEAR}–{year} VAREN. Цены на сайте не являются публичной офертой.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-paper">
              Политика конфиденциальности
            </Link>
            <span>Демонстрационный проект</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
