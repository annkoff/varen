"use client";

import type { Project } from "@prisma/client";
import { useActionState } from "react";
import { MATERIALS } from "@/content/site";
import { saveProject, type ProjectFormState } from "@/app/admin/(panel)/projects/actions";

export function ProjectForm({ project }: { project?: Project }) {
  const [state, action, pending] = useActionState<ProjectFormState, FormData>(saveProject, undefined);
  const fe = state?.fieldErrors ?? {};
  const f = (name: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, span = "") => (
    <label className={`block ${span}`}>
      <span className="mb-1.5 block text-xs text-mute">{label}</span>
      <input name={name} className="field-box" aria-invalid={fe[name] ? true : undefined} {...props} />
      {fe[name] && <span className="field-error block">{fe[name]}</span>}
    </label>
  );

  return (
    <form action={action} className="space-y-6">
      {project && <input type="hidden" name="id" value={project.id} />}
      <div className="grid gap-4 md:grid-cols-2">
        {f("title", "Название *", { defaultValue: project?.title, required: true, maxLength: 120 })}
        {f("slug", "Адрес страницы (латиница; пусто — из названия)", { defaultValue: project?.slug, maxLength: 80, placeholder: "dom-u-lesa" })}
        {f("location", "Местоположение *", { defaultValue: project?.location, required: true, maxLength: 120 })}
        {f("style", "Стиль *", { defaultValue: project?.style, required: true, maxLength: 60 })}
      </div>
      <label className="block">
        <span className="mb-1.5 block text-xs text-mute">Краткое описание (карточка и SEO) *</span>
        <textarea name="summary" defaultValue={project?.summary} rows={2} maxLength={400} className="field-box" required />
        {fe.summary && <span className="field-error block">{fe.summary}</span>}
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs text-mute">Описание проекта * (абзацы через пустую строку)</span>
        <textarea name="description" defaultValue={project?.description} rows={7} maxLength={6000} className="field-box" required />
        {fe.description && <span className="field-error block">{fe.description}</span>}
      </label>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {f("area", "Площадь, м² *", { defaultValue: project?.area, type: "number", min: 10, max: 5000, required: true })}
        {f("floors", "Этажей *", { defaultValue: project?.floors ?? 2, type: "number", min: 1, max: 5, required: true })}
        <label className="block">
          <span className="mb-1.5 block text-xs text-mute">Материал *</span>
          <input name="material" list="materials" defaultValue={project?.material} className="field-box" required maxLength={60} />
          <datalist id="materials">
            {MATERIALS.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          {fe.material && <span className="field-error block">{fe.material}</span>}
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs text-mute">Комплектация</span>
          <select name="packageLevel" defaultValue={project?.packageLevel ?? "turnkey"} className="field-box">
            <option value="warm">Тёплый контур</option>
            <option value="prefinish">Предчистовая</option>
            <option value="turnkey">Под ключ</option>
          </select>
        </label>
        {f("year", "Год *", { defaultValue: project?.year ?? new Date().getFullYear(), type: "number", min: 2005, max: 2100, required: true })}
        {f("durationMonths", "Срок, мес. *", { defaultValue: project?.durationMonths ?? 8, type: "number", min: 1, max: 60, required: true })}
        {f("plotArea", "Участок, соток", { defaultValue: project?.plotArea ?? "", type: "number", min: 1 })}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs text-mute">«В этом проекте выполнено» — по одному пункту в строке</span>
          <textarea name="worksDone" defaultValue={project?.worksDone.join("\n")} rows={8} className="field-box" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs text-mute">Дополнительные объекты — по одному в строке</span>
          <textarea name="extras" defaultValue={project?.extras.join("\n")} rows={8} className="field-box" placeholder={"Баня\nБеседка"} />
        </label>
      </div>
      <div className="flex flex-wrap gap-6 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="published" defaultChecked={project?.published ?? true} className="h-4 w-4 accent-[var(--color-sand)]" /> Опубликован
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="featured" defaultChecked={project?.featured ?? false} className="h-4 w-4 accent-[var(--color-sand)]" /> Показывать на главной
        </label>
      </div>
      {state?.error && <p className="text-sm text-err" role="alert">{state.error}</p>}
      {state?.ok && <p className="text-sm text-ok" role="status">Сохранено</p>}
      <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
        {pending ? "Сохраняем…" : project ? "Сохранить" : "Создать проект"}
      </button>
    </form>
  );
}
