"use client";

import clsx from "clsx";
import { useRef, useState } from "react";
import { ACCEPT_ATTR, ALLOWED_EXTENSIONS, extensionOf, MAX_FILES } from "@/lib/security/files";
import { formatFileSize } from "@/lib/format";

export interface UploadItem {
  key: string;
  name: string;
  size: number;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
  id?: string;
}

function uploadWithProgress(file: File, formId: string, onProgress: (p: number) => void): Promise<{ id: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const body = new FormData();
    body.append("formId", formId);
    body.append("file", file);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let json: { id?: string; error?: string } = {};
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        /* non-JSON error page */
      }
      if (xhr.status >= 200 && xhr.status < 300 && json.id) resolve({ id: json.id });
      else reject(new Error(json.error ?? (xhr.status === 413 ? "Файл слишком большой" : "Не удалось загрузить файл")));
    };
    xhr.onerror = () => reject(new Error("Нет соединения. Попробуйте ещё раз."));
    xhr.open("POST", "/api/uploads");
    xhr.send(body);
  });
}

export function FileUploader({ formId, maxMb, items, onChange, disabled }: { formId: string; maxMb: number; items: UploadItem[]; onChange: (fn: (prev: UploadItem[]) => UploadItem[]) => void; disabled?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const active = items.filter((i) => i.status !== "error");

  function addFiles(list: FileList | File[]) {
    setNotice(null);
    const files = Array.from(list);
    const free = MAX_FILES - active.length;
    if (free <= 0) {
      setNotice(`Можно прикрепить не больше ${MAX_FILES} файлов`);
      return;
    }
    if (files.length > free) setNotice(`Добавлены первые ${free} — максимум ${MAX_FILES} файлов`);

    for (const file of files.slice(0, free)) {
      const key = `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`;
      const ext = extensionOf(file.name);
      let error: string | undefined;
      if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) error = "Допустимы PDF, JPG, PNG, WEBP";
      else if (file.size > maxMb * 1024 * 1024) error = `Больше ${maxMb} МБ`;
      else if (file.size === 0) error = "Файл пустой";

      onChange((prev) => [...prev, { key, name: file.name, size: file.size, progress: 0, status: error ? "error" : "uploading", error }]);
      if (error) continue;

      uploadWithProgress(file, formId, (p) => onChange((prev) => prev.map((i) => (i.key === key ? { ...i, progress: p } : i))))
        .then(({ id }) => onChange((prev) => prev.map((i) => (i.key === key ? { ...i, id, progress: 100, status: "done" } : i))))
        .catch((e: Error) => onChange((prev) => prev.map((i) => (i.key === key ? { ...i, status: "error", error: e.message } : i))));
    }
  }

  async function remove(item: UploadItem) {
    onChange((prev) => prev.filter((i) => i.key !== item.key));
    if (item.id) await fetch(`/api/uploads/${item.id}?formId=${formId}`, { method: "DELETE" }).catch(() => undefined);
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (!disabled) addFiles(e.dataTransfer.files);
        }}
        className={clsx("flex flex-col items-center justify-center gap-3 border border-dashed px-6 py-10 text-center transition-colors", drag ? "border-paper bg-ink-3" : "border-line-strong")}
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6 text-mute" fill="none" stroke="currentColor" strokeWidth={1.2} aria-hidden>
          <path d="M12 16V4M7 9l5-5 5 5M4 16v4h16v-4" />
        </svg>
        <p className="text-[15px]">
          Перетащите файлы или{" "}
          <button type="button" className="link-underline text-sand-2" onClick={() => inputRef.current?.click()} disabled={disabled || active.length >= MAX_FILES}>
            выберите на устройстве
          </button>
        </p>
        <p className="text-xs text-dim">
          Проект, планировки, референсы · PDF, JPG, PNG, WEBP · до {maxMb} МБ · не больше {MAX_FILES} файлов
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_ATTR}
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {notice && <p className="field-error">{notice}</p>}

      {items.length > 0 && (
        <ul className="mt-4 divide-y divide-line border border-line" aria-label="Выбранные файлы">
          {items.map((it) => (
            <li key={it.key} className="relative flex items-center gap-4 px-4 py-3">
              <span className="w-10 shrink-0 text-[10px] tracking-[0.14em] text-mute uppercase">{extensionOf(it.name) || "—"}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{it.name}</span>
                <span className={clsx("block text-xs", it.status === "error" ? "text-err" : "text-dim")}>
                  {it.status === "error" ? it.error : it.status === "uploading" ? `Загрузка… ${it.progress}%` : `${formatFileSize(it.size)} · загружен`}
                </span>
              </span>
              <button type="button" onClick={() => remove(it)} className="flex h-9 w-9 shrink-0 items-center justify-center text-mute hover:text-paper" aria-label={`Удалить ${it.name}`} disabled={disabled}>
                <svg viewBox="0 0 12 12" className="h-3 w-3" stroke="currentColor" strokeWidth={1.4} aria-hidden>
                  <path d="M1 1l10 10M11 1 1 11" />
                </svg>
              </button>
              {it.status === "uploading" && <span className="absolute bottom-0 left-0 h-px bg-sand transition-[width]" style={{ width: `${it.progress}%` }} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
