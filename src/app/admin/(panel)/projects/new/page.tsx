import Link from "next/link";
import { ProjectForm } from "@/components/admin/project-form";
import { AdminHeader, Card } from "@/components/admin/ui";

export const metadata = { title: "Новый проект" };

export default function NewProjectPage() {
  return (
    <>
      <Link href="/admin/projects" className="mb-4 inline-block text-xs text-mute hover:text-paper">
        ← Все проекты
      </Link>
      <AdminHeader title="Новый проект" text="После создания можно будет загрузить фотографии." />
      <Card>
        <ProjectForm />
      </Card>
    </>
  );
}
