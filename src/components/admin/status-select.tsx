"use client";

import { useTransition } from "react";
import type { LeadStatus } from "@prisma/client";

const OPTIONS: Array<[LeadStatus, string]> = [
  ["NEW", "Новая"],
  ["IN_PROGRESS", "В работе"],
  ["DONE", "Завершена"],
  ["CANCELLED", "Отменена"],
];

/** Saves the status immediately on change. */
export function StatusSelect({ id, status, action }: { id: number; status: LeadStatus; action: (f: FormData) => Promise<void> }) {
  const [pending, start] = useTransition();
  return (
    <select
      aria-label="Статус заявки"
      defaultValue={status}
      disabled={pending}
      className="field-box w-auto py-1.5 pr-8 text-sm"
      onChange={(e) => {
        const f = new FormData();
        f.set("id", String(id));
        f.set("status", e.target.value);
        start(() => action(f));
      }}
    >
      {OPTIONS.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}
