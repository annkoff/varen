import Image from "next/image";
import Link from "next/link";
import { AdminHeader, Badge, EmptyState } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { formatNumber } from "@/lib/format";
import { moveProject, toggleProjectFlag } from "./actions";

export const metadata = { title: "Проекты" };

export default async function AdminProjectsPage() {
  const projects = await db.project.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, _count: { select: { images: true, reviews: true } } },
  });
  return (
    <>
      <AdminHeader
        title="Проекты"
        text="Каталог на сайте. Порядок здесь = порядок на странице «Проекты». «На главной» — показывать в избранных."
        actions={
          <Link href="/admin/projects/new" className="btn btn-primary btn-sm">
            + Новый проект
          </Link>
        }
      />
      {projects.length === 0 ? (
        <EmptyState>Проектов пока нет.</EmptyState>
      ) : (
        <ul className="divide-y divide-line border border-line">
          {projects.map((p, i) => (
            <li key={p.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <Link href={`/admin/projects/${p.id}`} className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-ink-3 sm:w-32">
                {p.images[0] && <Image src={p.images[0].url} alt="" fill sizes="128px" quality={70} className="object-cover" />}
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/admin/projects/${p.id}`} className="text-lg hover:underline">
                  {p.title}
                </Link>
                <p className="text-xs text-mute">
                  {p.location} · {formatNumber(p.area)} м² · {p.floors} эт. · {p.material} · фото: {p._count.images}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {p.published ? <Badge tone="ok">опубликован</Badge> : <Badge>скрыт</Badge>}
                  {p.featured && <Badge tone="warn">на главной</Badge>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <form action={moveProject}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="dir" value="up" />
                  <button className="btn btn-outline btn-sm px-3" disabled={i === 0} aria-label="Выше">
                    ↑
                  </button>
                </form>
                <form action={moveProject}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="dir" value="down" />
                  <button className="btn btn-outline btn-sm px-3" disabled={i === projects.length - 1} aria-label="Ниже">
                    ↓
                  </button>
                </form>
                <form action={toggleProjectFlag}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="flag" value="published" />
                  <button className="btn btn-outline btn-sm">{p.published ? "Скрыть" : "Опубликовать"}</button>
                </form>
                <form action={toggleProjectFlag}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="flag" value="featured" />
                  <button className="btn btn-outline btn-sm">{p.featured ? "Убрать с главной" : "На главную"}</button>
                </form>
                <Link href={`/admin/projects/${p.id}`} className="btn btn-primary btn-sm">
                  Редактировать
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
