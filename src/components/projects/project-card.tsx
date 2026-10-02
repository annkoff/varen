import clsx from "clsx";
import Image from "next/image";
import { blurProps } from "@/lib/images";
import Link from "next/link";
import type { ProjectCardData } from "@/lib/catalog";
import { formatNumber, plural } from "@/lib/format";

export function ProjectCard({
  project,
  aspect = "aspect-[4/5]",
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  priority,
  index,
}: {
  project: ProjectCardData;
  aspect?: string;
  sizes?: string;
  priority?: boolean;
  index?: number;
}) {
  const cover = project.images[0];
  return (
    <Link href={`/projects/${project.slug}`} className="group block" data-cta="project_card">
      <div className={clsx("img-zoom relative overflow-hidden bg-ink-2", aspect)}>
        {cover && (
          <Image src={cover.url} {...blurProps(cover.url)} alt={cover.alt || project.title} fill sizes={sizes} priority={priority} quality={85} className="object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-transparent to-transparent opacity-80 transition-opacity duration-700 group-hover:opacity-100" />
        {index !== undefined && <span className="absolute left-5 top-5 text-xs tracking-[0.2em] text-paper/80">{String(index + 1).padStart(2, "0")}</span>}
        <span className="absolute bottom-5 right-5 flex h-10 w-10 items-center justify-center border border-paper/40 text-paper opacity-0 transition-all duration-500 group-hover:opacity-100">
          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={1.2} aria-hidden>
            <path d="M1 11 11 1M4 1h7v7" />
          </svg>
        </span>
      </div>
      <div className="mt-5 flex items-start justify-between gap-6">
        <div>
          <h3 className="h-card text-xl md:text-2xl">{project.title}</h3>
          <p className="mt-1.5 text-sm text-mute">{project.location}</p>
        </div>
        <p className="shrink-0 text-right text-sm text-paper/70">
          {formatNumber(project.area)} м²
          <br />
          <span className="text-mute">
            {project.floors} {plural(project.floors, ["этаж", "этажа", "этажей"])}
          </span>
        </p>
      </div>
    </Link>
  );
}
