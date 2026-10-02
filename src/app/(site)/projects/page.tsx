import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { ProjectCard } from "@/components/projects/project-card";
import { CtaBand } from "@/components/sections/cta-band";
import { PageHero } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/reveal";
import { getProjectMaterials, getProjects } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Проекты",
  description: "Построенные VAREN дома: барнхаусы, шале, неоклассика, минимализм. Площадь, материал, этажность и состав работ по каждому проекту.",
  alternates: { canonical: "/projects" },
};

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const material = typeof sp.material === "string" ? sp.material : undefined;
  const floors = typeof sp.floors === "string" && ["1", "2", "3"].includes(sp.floors) ? Number(sp.floors) : undefined;
  const [projects, materials] = await Promise.all([getProjects({ material, floors }), getProjectMaterials()]);

  const href = (next: { material?: string; floors?: number }) => {
    const p = new URLSearchParams();
    if (next.material) p.set("material", next.material);
    if (next.floors) p.set("floors", String(next.floors));
    const s = p.toString();
    return s ? `/projects?${s}` : "/projects";
  };

  return (
    <>
      <PageHero bg="/images/backgrounds/forest-lodge.webp" eyebrow="Проекты" title="Дома, которые мы построили" text="Двенадцать разных историй: от компактного одноэтажного дома до особняка на три этажа. Откройте любой — внутри фотографии, параметры и что именно мы сделали." />

      <section className="py-16 md:py-24">
        <div className="container-x">
          <nav aria-label="Фильтры проектов" className="mb-14 flex flex-col gap-6 border-b border-line pb-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="-mx-5 overflow-x-auto px-5 md:mx-0 md:px-0">
              <div className="flex w-max gap-2">
                <Link href={href({ floors })} className="chip text-[13px]" aria-pressed={!material}>
                  Все материалы
                </Link>
                {materials.map((m) => (
                  <Link key={m} href={href({ material: m, floors })} className="chip text-[13px]" aria-pressed={material === m}>
                    {m}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              {[undefined, 1, 2, 3].map((f) => (
                <Link key={f ?? "all"} href={href({ material, floors: f })} className={clsx("chip text-[13px]")} aria-pressed={floors === f}>
                  {f ? `${f} эт.` : "Любая этажность"}
                </Link>
              ))}
            </div>
          </nav>

          {projects.length === 0 ? (
            <div className="py-24 text-center">
              <p className="text-2xl font-light">По этим фильтрам проектов нет</p>
              <Link href="/projects" className="btn btn-outline mt-8">
                Сбросить фильтры
              </Link>
            </div>
          ) : (
            <div className="grid gap-x-6 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p, i) => (
                <Reveal key={p.id} delay={(i % 3) * 80}>
                  <ProjectCard project={p} index={i} priority={i < 3} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      <CtaBand title="Не нашли свой дом?" text="Покажите референсы или готовый проект — посчитаем стоимость и сроки под ваш участок." image="/images/photos/ph-125.webp" />
    </>
  );
}
