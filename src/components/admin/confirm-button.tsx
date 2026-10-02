"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

/** Two-step submit button: first click asks for confirmation inline (no window.confirm). */
export function ConfirmButton({ children, message, className }: { children: React.ReactNode; message: string; className?: string }) {
  const [armed, setArmed] = useState(false);
  const { pending } = useFormStatus();
  if (!armed) {
    return (
      <button type="button" className={className} onClick={() => setArmed(true)}>
        {children}
      </button>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-xs text-err">{message}</p>
      <div className="flex gap-2">
        <button type="submit" className="btn btn-sm bg-err text-ink" disabled={pending}>
          {pending ? "Удаляем…" : "Да, удалить"}
        </button>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setArmed(false)}>
          Отмена
        </button>
      </div>
    </div>
  );
}
