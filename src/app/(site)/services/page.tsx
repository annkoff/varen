import type { Metadata } from "next";
import Image from "next/image";
import { blurProps } from "@/lib/images";
import Link from "next/link";
import { CtaBand } from "@/components/sections/cta-band";
import { Process } from "@/components/sections/process";
import { ButtonLink, PageHero } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/reveal";
import { SERVICES } from "@/content/services";

export const metadata: Metadata = {
  title: "Услуги",
  description: "Строительство домов под ключ, архитектура и проектирование, внутренняя отделка, инженерные системы и благоустройство участка.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <>
      <PageHero bg="/images/backgrounds/pool-villa.webp" eyebrow="Услуги" title="Пять направлений, одна команда" text="Можно заказать всё вместе — от проекта до газона, — а можно только то, что нужно сейчас. Каждое направление ведёт свой руководитель, но смета и ответственность общие." />

      <section className="py-16 md:py-24">
        <div className="container-x space-y-24 md:space-y-36">
          {SERVICES.map((s, i) => (
            <Reveal key={s.slug} className="grid gap-10 lg:grid-cols-12 lg:items-center">
              <Link href={`/services/${s.slug}`} className={`img-zoom relative block aspect-[4/3] overflow-hidden bg-ink-2 lg:col-span-7 ${i % 2 ? "lg:order-2 lg:col-start-6" : ""}`}>
                <Image src={s.image} {...blurProps(s.image)} alt={s.title} fill sizes="(min-width: 1024px) 58vw, 100vw" quality={85} className="object-cover" />
              </Link>
              <div className={`lg:col-span-5 ${i % 2 ? "lg:order-1 lg:col-start-1 lg:row-start-1" : "lg:col-start-8"}`}>
                <p className="eyebrow mb-5">{s.number}</p>
                <h2 className="text-[clamp(1.9rem,3.6vw,3rem)] font-light leading-tight tracking-tight">{s.title}</h2>
                <p className="mt-5 text-[15px] leading-relaxed text-mute">{s.short}</p>
                <ul className="mt-8 border-t border-line">
                  {s.works.slice(0, 5).map((w) => (
                    <li key={w} className="border-b border-line py-3 text-[15px] text-paper/85">
                      {w}
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-sm text-sand">{s.priceNote}</p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <ButtonLink href={`/services/${s.slug}`} variant="outline" cta={`service_more_${s.number}`}>
                    Подробнее
                  </ButtonLink>
                  <ButtonLink href={`/request?service=${s.leadService}`} cta={`service_request_${s.number}`}>
                    Обсудить
                  </ButtonLink>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <Process index="—" />
      <CtaBand />
    </>
  );
}
