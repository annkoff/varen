import type { Metadata } from "next";
import Image from "next/image";
import { blurProps } from "@/lib/images";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TrackOnMount } from "@/components/analytics/track-on-mount";
import { ProjectGallery, type GalleryImage } from "@/components/projects/project-gallery";
import { ReviewCard } from "@/components/reviews/review-card";
import { CtaBand } from "@/components/sections/cta-band";
import { Arrow, ButtonLink, DemoNote } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/reveal";
import { PACKAGE_LABELS } from "@/content/site";
import { getProject, getProjects } from "@/lib/catalog";
import { formatNumber, plural } from "@/lib/format";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

const MATERIAL_TO_CALC: Record<string, string> = {
  Газобетон: "aerated",
  Кирпич: "brick",
  "Клееный брус": "timber",
  "Оцилиндрованное бревно": "timber",
  Каркас: "frame",
  Монолит: "monolith",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProject(slug);
  if (!p) return { title: "Проект не найден" };
  const cover = p.images[0];
  return {
    title: `${p.title} — ${formatNumber(p.area)} м², ${p.material.toLowerCase()}`,
    description: p.summary,
    alternates: { canonical: `/projects/${p.slug}` },
    openGraph: { title: p.title, description: p.summary, images: cover ? [{ url: cover.url, alt: cover.alt }] : undefined },
  };
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) notFound();

  const all = await getProjects();
  const idx = all.findIndex((p) => p.id === project.id);
  const next = all[(idx + 1) % all.length];
  const cover = project.images[0];

  const calcParams = new URLSearchParams({
    area: String(project.area),
    floors: String(project.floors),
    material: MATERIAL_TO_CALC[project.material] ?? "other",
    package: project.packageLevel,
  });

  const specs: Array<[string, string]> = [
    ["Площадь", `${formatNumber(project.area)} м²`],
    ["Этажность", `${project.floors} ${plural(project.floors, ["этаж", "этажа", "этажей"])}`],
    ["Материал", project.material],
    ["Стиль", project.style],
    ...(project.plotArea ? ([["Участок", `${project.plotArea} ${plural(project.plotArea, ["сотка", "сотки", "соток"])}`]] as Array<[string, string]>) : []),
    ["Комплектация", PACKAGE_LABELS[project.packageLevel] ?? project.packageLevel],
    ["Год", String(project.year)],
    ["Срок", `${project.durationMonths} ${plural(project.durationMonths, ["месяц", "месяца", "месяцев"])}`],
  ];

  const gallery: GalleryImage[] = project.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt || project.title, category: i.category, blur: blurProps(i.url).blurDataURL }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title,
    description: project.summary,
    image: project.images.map((i) => i.url),
    locationCreated: project.location,
    creator: { "@type": "Organization", name: "VAREN" },
  };

  return (
    <article>
      <TrackOnMount type="project_view" label={project.slug} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <header className="relative isolate flex min-h-[86svh] items-end overflow-hidden">
        {cover && <Image src={cover.url} {...blurProps(cover.url)} alt={cover.alt || project.title} fill priority sizes="100vw" quality={92} className="-z-10 object-cover animate-slow-zoom" />}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/30 to-ink/40" />
        <div className="container-x pb-12 pt-36 md:pb-16">
          <nav aria-label="Хлебные крошки" className="eyebrow mb-6 flex flex-wrap items-center gap-3 text-paper/70 animate-hero">
            <Link href="/projects" className="hover:text-paper">
              Проекты
            </Link>
            <span className="h-px w-6 bg-line-strong" />
            <span>{project.location}</span>
          </nav>
          <h1 className="display max-w-5xl text-[clamp(2.8rem,8vw,7rem)] animate-hero" style={{ animationDelay: "80ms" }}>
            {project.title}
          </h1>
          <p className="lead-text mt-6 max-w-2xl animate-hero" style={{ animationDelay: "160ms" }}>
            {project.summary}
          </p>
        </div>
      </header>

      <section className="py-20 md:py-28">
        <div className="container-x grid gap-16 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <dl className="border-t border-line">
              {specs.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-6 border-b border-line py-4 text-[15px]">
                  <dt className="text-mute">{k}</dt>
                  <dd className="text-right">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-8 flex flex-col gap-3">
              <ButtonLink href={`/prices?${calcParams}#calculator`} cta="project_calculate">
                Рассчитать похожий дом
              </ButtonLink>
              <ButtonLink href={`/request?project=${project.slug}`} variant="outline" cta="project_request">
                Хочу такой же
              </ButtonLink>
            </div>
          </Reveal>

          <div className="lg:col-span-7 lg:col-start-6">
            <Reveal className="prose-v text-lg">
              {project.description.split(/\n{2,}/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </Reveal>

            <Reveal className="mt-16">
              <h2 className="eyebrow mb-6 text-paper">В этом проекте выполнено</h2>
              <ul className="grid gap-x-10 sm:grid-cols-2">
                {project.worksDone.map((w) => (
                  <li key={w} className="flex gap-4 border-b border-line py-4 text-[15px]">
                    <span className="mt-[0.7em] h-px w-4 shrink-0 bg-sand" />
                    {w}
                  </li>
                ))}
              </ul>
            </Reveal>

            {project.extras.length > 0 && (
              <Reveal className="mt-12">
                <h2 className="eyebrow mb-5 text-paper">Дополнительные объекты</h2>
                <div className="flex flex-wrap gap-2">
                  {project.extras.map((x) => (
                    <span key={x} className="chip cursor-default text-[13px]">
                      {x}
                    </span>
                  ))}
                </div>
              </Reveal>
            )}
          </div>
        </div>
      </section>

      <section className="border-t border-line py-20 md:py-28">
        <div className="container-x">
          <Reveal className="mb-10 flex items-end justify-between gap-6">
            <h2 className="h-section">Галерея</h2>
            <p className="hidden text-sm text-mute md:block">Экстерьер, интерьер, отделка, участок и ландшафт</p>
          </Reveal>
          <ProjectGallery images={gallery} projectSlug={project.slug} />
        </div>
      </section>

      {project.reviews.length > 0 && (
        <section className="border-t border-line py-20 md:py-28">
          <div className="container-x grid gap-12 lg:grid-cols-12">
            <p className="eyebrow lg:col-span-4">Отзыв заказчика</p>
            <div className="lg:col-span-8">
              {project.reviews.map((r) => (
                <ReviewCard key={r.id} review={{ ...r, project: null }} />
              ))}
              <DemoNote className="mt-6">Демонстрационный отзыв.</DemoNote>
            </div>
          </div>
        </section>
      )}

      {next && next.id !== project.id && (
        <Link href={`/projects/${next.slug}`} className="group block border-t border-line">
          <div className="container-x flex items-center justify-between gap-8 py-14 md:py-20">
            <div>
              <p className="eyebrow mb-3">Следующий проект</p>
              <p className="text-[clamp(1.8rem,4vw,3.5rem)] font-light tracking-tight transition-colors group-hover:text-sand-2">{next.title}</p>
            </div>
            <Arrow className="h-4 w-12 transition-transform duration-500 group-hover:translate-x-2" />
          </div>
        </Link>
      )}

      <CtaBand title="Хотите похожий дом?" text="Пересчитаем этот проект под ваш участок, материал и комплектацию." image={project.images[1]?.url ?? cover?.url} />
    </article>
  );
}
