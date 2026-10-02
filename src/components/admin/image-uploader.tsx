"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { IMAGE_CATEGORY_LABELS } from "@/content/site";

/** Uploads catalog photos one by one to /api/admin/projects/:id/images. */
export function ImageUploader({ projectId }: { projectId: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState("EXTERIOR");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function upload(files: FileList) {
    setBusy(true);
    const errors: string[] = [];
    let done = 0;
    for (const file of Array.from(files)) {
      setStatus(`Загружаем ${done + 1} из ${files.length}…`);
      const body = new FormData();
      body.set("file", file);
      body.set("category", category);
      const res = await fetch(`/api/admin/projects/${projectId}/images`, { method: "POST", body }).catch(() => null);
      if (!res?.ok) {
        const j = (await res?.json().catch(() => null)) as { error?: string } | null;
        errors.push(`${file.name}: ${j?.error ?? "ошибка загрузки"}`);
      } else done++;
    }
    setBusy(false);
    setStatus(errors.length ? `Загружено ${done}. Ошибки: ${errors.join("; ")}` : `Загружено фото: ${done}`);
    if (input.current) input.current.value = "";
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 border border-dashed border-line-strong p-4 sm:flex-row sm:items-center">
      <select value={category} onChange={(e) => setCategory(e.target.value)} className="field-box sm:w-48" aria-label="Категория новых фото">
        {Object.entries(IMAGE_CATEGORY_LABELS).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
      <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? "Загрузка…" : "Загрузить фото"}
      </button>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => e.target.files?.length && upload(e.target.files)} />
      <p className="text-xs text-mute">{status ?? "JPG, PNG, WEBP до 15 МБ. Фото автоматически сжимаются в WebP."}</p>
    </div>
  );
}
