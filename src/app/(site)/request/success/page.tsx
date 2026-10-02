import type { Metadata } from "next";
import Image from "next/image";
import { ButtonLink } from "@/components/ui/primitives";
import { leadNumber } from "@/lib/format";
import { getContacts } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Заявка отправлена",
  robots: { index: false, follow: false },
};

export default async function SuccessPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const n = typeof sp.n === "string" && /^\d{1,9}$/.test(sp.n) ? Number(sp.n) : null;
  const contacts = await getContacts();

  return (
    <section className="relative isolate flex min-h-[100svh] items-center overflow-hidden">
      <Image src="/images/photos/ph-21.webp" alt="" fill priority sizes="100vw" quality={85} className="-z-10 object-cover" />
      <div className="absolute inset-0 -z-10 bg-ink/80" />
      <div className="container-x py-36">
        <div className="max-w-3xl animate-hero">
          <span className="mb-10 flex h-14 w-14 items-center justify-center border border-paper/50">
            <svg viewBox="0 0 20 14" className="h-4 w-5" fill="none" stroke="currentColor" strokeWidth={1.4} aria-hidden>
              <path d="M1 7l6 6L19 1" />
            </svg>
          </span>
          <p className="eyebrow mb-6">{n ? `Заявка ${leadNumber(n)}` : "Заявка принята"}</p>
          <h1 className="display text-[clamp(2.8rem,7vw,6rem)]">Спасибо. Мы получили вашу заявку</h1>
          <p className="lead-text mt-8 max-w-xl">
            Менеджер свяжется с вами в течение рабочего дня — обычно быстрее. Если вопрос срочный, позвоните:{" "}
            <a href={`tel:${contacts.phoneHref}`} className="text-paper underline underline-offset-4">
              {contacts.phone}
            </a>
          </p>
          <div className="mt-12 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/projects" cta="success_projects">
              Смотреть проекты
            </ButtonLink>
            <ButtonLink href="/" variant="outline" cta="success_home">
              На главную
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
