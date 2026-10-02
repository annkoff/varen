import Image from "next/image";
import { blurProps } from "@/lib/images";
import Link from "next/link";
import { ProjectCard } from "@/components/projects/project-card";
import { ReviewCard } from "@/components/reviews/review-card";
import { Advantages } from "@/components/sections/advantages";
import { ContactsBlock } from "@/components/sections/contacts-block";
import { CtaBand } from "@/components/sections/cta-band";
import { Faq } from "@/components/sections/faq";
import { PriceTiers } from "@/components/sections/price-tiers";
import { Process } from "@/components/sections/process";
import { Materials } from "@/components/sections/materials";
import { Arrow, ButtonLink, DemoNote, Section, SectionHeader } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/reveal";
import { SERVICES } from "@/content/services";
import { FOUNDED_YEAR } from "@/content/site";
import { getProjects, getReviews } from "@/lib/catalog";
import { getContacts, getPricing } from "@/lib/settings";
import { plural } from "@/lib/format";

export const dynamic = "force-dynamic";

const EXTRA_DIRECTIONS = [
  ["Архитектура", "/services/arhitektura-i-proektirovanie"],
  ["Дизайн", "/services/vnutrennyaya-otdelka-i-interer"],
  ["Инженерия", "/services/inzhenernye-sistemy"],
  ["Ландшафт", "/services/blagoustroystvo-territorii"],
  ["Газон", "/services/blagoustroystvo-territorii"],
  ["Деревья и озеленение", "/services/blagoustroystvo-territorii"],
  ["Освещение", "/services/blagoustroystvo-territorii"],
  ["Террасы", "/services/blagoustroystvo-territorii"],
  ["Беседки", "/services/blagoustroystvo-territorii"],
] as const;

const OWN_PROJECT = [
  { t: "Проект от VAREN", d: "Наш архитектор проектирует дом под участок и вашу семью. Конструктив и инженерия — сразу, в одной команде." },
  { t: "Ваш проект", d: "Принесите готовый архитектурный или дизайн-проект. Проверим, посчитаем, при необходимости адаптируем под технологию." },
  { t: "Ваш дизайнер", d: "Работаем в паре с вашим дизайнером: он отвечает за образ, мы — за то, чтобы его замысел был построен точно." },
];

export default async function HomePage() {
  const [featured, reviews, contacts, pricing] = await Promise.all([getProjects({ featured: true, take: 5 }), getReviews(3), getContacts(), getPricing()]);
  const years = new Date().getFullYear() - FOUNDED_YEAR;

  return (
    <>
      {/* Hero */}
      <section className="relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden">
        <Image src="/images/photos/ph-49.webp" {...blurProps("/images/photos/ph-49.webp")} alt="Современный загородный дом VAREN с архитектурной подсветкой" fill priority sizes="100vw" quality={92} className="-z-10 object-cover animate-slow-zoom" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/35 to-ink/50" />
        <div className="container-x pb-10 pt-32 md:pb-14">
          <p className="eyebrow mb-6 animate-hero text-paper/70">С {FOUNDED_YEAR} года · по всей России</p>
          <h1 className="animate-hero" style={{ animationDelay: "80ms" }}>
            <span className="display block text-[clamp(4.2rem,17vw,15rem)] tracking-[-0.05em]">VAREN</span>
            <span className="mt-3 block max-w-2xl text-[clamp(1.35rem,2.6vw,2.2rem)] font-light leading-snug tracking-tight text-paper/90">
              Строительство домов по всей России
            </span>
          </h1>
          <div className="mt-10 flex flex-col gap-3 animate-hero sm:flex-row" style={{ animationDelay: "180ms" }}>
            <ButtonLink href="/prices#calculator" cta="hero_calculate">
              Рассчитать стоимость
            </ButtonLink>
            <ButtonLink href="/projects" variant="outline" cta="hero_projects">
              Смотреть проекты
            </ButtonLink>
          </div>
          <dl className="mt-14 grid grid-cols-2 gap-y-6 border-t border-line-strong pt-6 text-sm md:grid-cols-4">
            {[
              [`${years} ${plural(years, ["год", "года", "лет"])}`, "строим частные дома"],
              ["Под ключ", "от фундамента до ключей"],
              ["Любой материал", "выбираете вы"],
              ["Вся Россия", "свои бригады и партнёры"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-paper">{k}</dt>
                <dd className="text-mute">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Positioning */}
      <Section bg="/images/backgrounds/green-modern.webp" bgOpacity={0.42}>
        <div className="grid gap-12 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <p className="eyebrow flex items-center gap-4">
              <span className="text-paper">01</span>
              <span className="h-px w-10 bg-line-strong" />О нас
            </p>
          </Reveal>
          <Reveal className="lg:col-span-8" delay={80}>
            <p className="text-[clamp(1.6rem,3.2vw,2.75rem)] font-light leading-[1.25] tracking-tight">
              Мы строим дома, в которых живут, а не которые показывают гостям. Фундамент, стены, тепло, отделка, сад —{" "}
              <span className="text-mute">одна команда отвечает за всё, что вы увидите, и за всё, что спрятано внутри стен.</span>
            </p>
            <div className="mt-10">
              <Link href="/about" className="btn btn-ghost group gap-4" data-cta="home_about">
                <span className="link-underline">О компании</span>
                <Arrow className="transition-transform duration-500 group-hover:translate-x-1" />
              </Link>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* Directions */}
      <Section className="pt-0 md:pt-0">
        <SectionHeader index="02" eyebrow="Направления" title="Что мы делаем" text="Основное — частные дома и внутренняя отделка. Всё, что вокруг дома, тоже можем взять на себя." />
        <div className="border-t border-line">
          {SERVICES.map((s, i) => (
            <Reveal key={s.slug} delay={i * 60}>
              <Link href={`/services/${s.slug}`} className="group grid items-center gap-6 border-b border-line py-7 md:grid-cols-12 md:py-9" data-cta={`home_service_${s.number}`}>
                <span className="text-xs tracking-[0.2em] text-mute md:col-span-1">{s.number}</span>
                <h3 className="text-[clamp(1.5rem,3vw,2.5rem)] font-light tracking-tight transition-colors group-hover:text-sand-2 md:col-span-5">{s.title}</h3>
                <p className="text-[15px] leading-relaxed text-mute md:col-span-4">{s.short}</p>
                <div className="relative hidden aspect-[4/3] overflow-hidden md:col-span-2 md:block">
                  <Image src={s.image} {...blurProps(s.image)} alt="" fill sizes="200px" quality={85} className="object-cover grayscale transition-all duration-700 group-hover:scale-105 group-hover:grayscale-0" />
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-10 flex flex-wrap gap-2">
          {EXTRA_DIRECTIONS.map(([label, href]) => (
            <Link key={label} href={href} className="chip text-[13px]">
              {label}
            </Link>
          ))}
        </Reveal>
      </Section>

      {/* Featured projects */}
      <Section className="border-t border-line">
        <SectionHeader
          index="03"
          eyebrow="Избранные проекты"
          title="Дома, которые мы построили"
          action={
            <ButtonLink href="/projects" variant="outline" cta="home_all_projects">
              Все проекты
            </ButtonLink>
          }
        />
        {featured.length > 0 && (
          <div className="grid gap-x-6 gap-y-14 md:grid-cols-2 lg:grid-cols-12">
            {featured.map((p, i) => (
              <Reveal
                key={p.id}
                delay={(i % 2) * 100}
                className={i === 0 ? "md:col-span-2 lg:col-span-8" : i === 1 ? "lg:col-span-4 lg:pt-24" : "lg:col-span-4"}
              >
                <ProjectCard
                  project={p}
                  index={i}
                  aspect={i === 0 ? "aspect-[4/3] md:aspect-[16/10]" : "aspect-[4/5]"}
                  sizes={i === 0 ? "(min-width: 1024px) 66vw, 100vw" : "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"}
                />
              </Reveal>
            ))}
          </div>
        )}
      </Section>

      <Materials pricing={pricing} index="04" />

      <Advantages index="05" />

      {/* Own project */}
      <Section className="pt-0 md:pt-0">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          <Reveal className="relative aspect-[4/5] overflow-hidden lg:col-span-5">
            <Image src="/images/photos/ph-87.webp" {...blurProps("/images/photos/ph-87.webp")} alt="Двусветная гостиная в доме VAREN" fill sizes="(min-width: 1024px) 40vw, 100vw" quality={85} className="object-cover" />
          </Reveal>
          <div className="lg:col-span-6 lg:col-start-7">
            <SectionHeader eyebrow="Как начать" title="С нашим проектом, с вашим или с вашим дизайнером" className="!mb-10 !block" />
            <div className="border-t border-line">
              {OWN_PROJECT.map((x, i) => (
                <Reveal key={x.t} delay={i * 80} className="grid gap-3 border-b border-line py-7 sm:grid-cols-[1fr_1.4fr] sm:gap-8">
                  <h3 className="h-card text-xl">{x.t}</h3>
                  <p className="text-[15px] leading-relaxed text-mute">{x.d}</p>
                </Reveal>
              ))}
            </div>
            <div className="mt-10">
              <ButtonLink href="/request" cta="home_own_project">
                Обсудить проект
              </ButtonLink>
            </div>
          </div>
        </div>
      </Section>

      <Process index="06" />

      {/* Pricing */}
      <Section id="prices">
        <SectionHeader index="07" eyebrow="Стоимость" title="Сколько стоит дом" text="Ориентиры за квадратный метр. Точную цифру по вашему дому покажет калькулятор — с формулой и расшифровкой." />
        <PriceTiers pricing={pricing} />
      </Section>

      {/* Reviews */}
      {reviews.length > 0 && (
        <Section className="border-t border-line">
          <SectionHeader
            index="08"
            eyebrow="Отзывы"
            title="Что говорят заказчики"
            action={
              <ButtonLink href="/reviews" variant="outline" cta="home_reviews">
                Все отзывы
              </ButtonLink>
            }
          />
          <div className="grid gap-12 md:grid-cols-3 md:gap-8">
            {reviews.map((r, i) => (
              <Reveal key={r.id} delay={i * 90}>
                <ReviewCard review={r} />
              </Reveal>
            ))}
          </div>
          <DemoNote className="mt-12">Отзывы на этом сайте — демонстрационные тексты для тестового проекта, не реальные отзывы клиентов.</DemoNote>
        </Section>
      )}

      <Faq index="09" />

      <CtaBand />

      {/* Contacts */}
      <Section>
        <SectionHeader index="10" eyebrow="Контакты" title="Приезжайте в гости" text="Покажем материалы, узлы и фотографии объектов. Лучше договориться о встрече заранее." />
        <ContactsBlock contacts={contacts} />
      </Section>
    </>
  );
}
