import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CtaBand } from "@/components/sections/cta-band";
import { Arrow, ButtonLink } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/reveal";
import { getService, SERVICES } from "@/content/services";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return SERVICES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = getService((await params).slug);
  if (!s) return { title: "Услуга не найдена" };
  return {
    title: s.title,
    description: s.short,
    alternates: { canonical: `/services/${s.slug}` },
    openGraph: { title: s.title, description: s.short, images: [{ url: s.image }] },
  };
}

export default async function ServicePage({ params }: Props) {
  const s = getService((await params).slug);
  if (!s) notFound();
  const idx = SERVICES.indexOf(s);
  const next = SERVICES[(idx + 1) % SERVICES.length];

  return (
    <article>
      <header className="relative isolate flex min-h-[78svh] items-end overflow-hidden">
        <Image src={s.image} alt={s.title} fill priority sizes="100vw" quality={80} className="-z-10 object-cover animate-slow-zoom" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/40 to-ink/50" />
        <div className="container-x pb-12 pt-36 md:pb-16">
          <nav aria-label="Хлебные крошки" className="eyebrow mb-6 flex items-center gap-3 text-paper/70">
            <Link href="/services" className="hover:text-paper">
              Услуги
            </Link>
            <span className="h-px w-6 bg-line-strong" />
            <span>{s.number}</span>
          </nav>
          <h1 className="display max-w-5xl text-[clamp(2.6rem,7.5vw,6.5rem)] animate-hero">{s.title}</h1>
        </div>
      </header>

      <section className="py-20 md:py-28">
        <div className="container-x grid gap-16 lg:grid-cols-12">
          <Reveal className="lg:col-span-6">
            <p className="text-[clamp(1.3rem,2.2vw,1.75rem)] font-light leading-relaxed text-paper/90">{s.intro}</p>
            <p className="mt-10 text-sand">{s.priceNote}</p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={`/request?service=${s.leadService}`} cta={`service_page_request_${s.number}`}>
                Оставить заявку
              </ButtonLink>
              <ButtonLink href="/prices#calculator" variant="outline" cta={`service_page_calc_${s.number}`}>
                Рассчитать стоимость
              </ButtonLink>
            </div>
          </Reveal>
          <Reveal className="lg:col-span-5 lg:col-start-8" delay={100}>
            <h2 className="eyebrow mb-6 text-paper">Перечень работ</h2>
            <ol className="border-t border-line">
              {s.works.map((w, i) => (
                <li key={w} className="flex gap-6 border-b border-line py-4 text-[15px]">
                  <span className="w-6 shrink-0 text-xs text-mute">{String(i + 1).padStart(2, "0")}</span>
                  {w}
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      <section className="pb-20 md:pb-28">
        <div className="container-x grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
          {s.gallery.map((src, i) => (
            <Reveal key={src} delay={i * 60} className={`relative overflow-hidden bg-ink-2 ${i === 0 ? "col-span-2 row-span-2 aspect-square" : "aspect-square"}`}>
              <Image src={src} alt={`${s.title} — пример работ`} fill sizes={i === 0 ? "50vw" : "25vw"} quality={70} className="object-cover" />
            </Reveal>
          ))}
        </div>
      </section>

      <Link href={`/services/${next.slug}`} className="group block border-t border-line">
        <div className="container-x flex items-center justify-between gap-8 py-14 md:py-20">
          <div>
            <p className="eyebrow mb-3">Следующее направление</p>
            <p className="text-[clamp(1.8rem,4vw,3.5rem)] font-light tracking-tight transition-colors group-hover:text-sand-2">{next.title}</p>
          </div>
          <Arrow className="h-4 w-12 transition-transform duration-500 group-hover:translate-x-2" />
        </div>
      </Link>
      <CtaBand />
    </article>
  );
}
