import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { ImageUploader } from "@/components/admin/image-uploader";
import { ProjectForm } from "@/components/admin/project-form";
import { AdminHeader, Card } from "@/components/admin/ui";
import { IMAGE_CATEGORY_LABELS } from "@/content/site";
import { db } from "@/lib/db";
import { deleteImage, deleteProject, moveImage, updateImage } from "../actions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> };

export const metadata = { title: "Редактирование проекта" };

export default async function EditProjectPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const project = await db.project.findUnique({ where: { id }, include: { images: { orderBy: { sortOrder: "asc" } } } });
  if (!project) notFound();

  return (
    <>
      <Link href="/admin/projects" className="mb-4 inline-block text-xs text-mute hover:text-paper">
        ← Все проекты
      </Link>
      <AdminHeader
        title={project.title}
        text={sp.created ? "Проект создан. Теперь добавьте фотографии." : `/projects/${project.slug}`}
        actions={
          <Link href={`/projects/${project.slug}`} target="_blank" className="btn btn-outline btn-sm">
            Открыть на сайте ↗
          </Link>
        }
      />

      <div className="grid gap-6 2xl:grid-cols-2">
        <Card title="Данные проекта">
          <ProjectForm project={project} />
        </Card>

        <Card title={`Фотографии (${project.images.length})`}>
          <ImageUploader projectId={project.id} />
          <ul className="mt-5 divide-y divide-line">
            {project.images.map((img, i) => (
              <li key={img.id} className="grid gap-3 py-4 sm:grid-cols-[120px_1fr]">
                <div className="relative aspect-[4/3] overflow-hidden bg-ink-3">
                  <Image src={img.url} alt={img.alt} fill sizes="120px" quality={70} className="object-cover" />
                  {i === 0 && <span className="absolute left-1 top-1 bg-sand px-1.5 text-[10px] text-ink">обложка</span>}
                </div>
                <div className="space-y-2">
                  <form action={updateImage} className="flex flex-col gap-2 sm:flex-row">
                    <input type="hidden" name="id" value={img.id} />
                    <select name="category" defaultValue={img.category} className="field-box sm:w-40" aria-label="Категория">
                      {Object.entries(IMAGE_CATEGORY_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                    <input name="alt" defaultValue={img.alt} maxLength={200} placeholder="Подпись к фото" className="field-box flex-1" />
                    <button className="btn btn-outline btn-sm">Сохранить</button>
                  </form>
                  <div className="flex flex-wrap gap-2">
                    {(["up", "down", "cover"] as const).map((dir) => (
                      <form key={dir} action={moveImage}>
                        <input type="hidden" name="id" value={img.id} />
                        <input type="hidden" name="dir" value={dir} />
                        <button className="btn btn-outline btn-sm px-3" disabled={(dir !== "down" && i === 0) || (dir === "down" && i === project.images.length - 1)}>
                          {dir === "up" ? "↑" : dir === "down" ? "↓" : "Сделать обложкой"}
                        </button>
                      </form>
                    ))}
                    <form action={deleteImage}>
                      <input type="hidden" name="id" value={img.id} />
                      <button className="btn btn-outline btn-sm border-err/40 text-err">Удалить</button>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Удаление" className="mt-6 max-w-md">
        <form action={deleteProject}>
          <input type="hidden" name="id" value={project.id} />
          <ConfirmButton message="Удалить проект вместе с фотографиями? Отзывы останутся, но потеряют привязку." className="btn btn-outline btn-sm border-err/50 text-err">
            Удалить проект
          </ConfirmButton>
        </form>
      </Card>
    </>
  );
}
