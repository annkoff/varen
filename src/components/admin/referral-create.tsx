"use client";

import { useActionState } from "react";
import { createReferral, type ReferralState } from "@/app/admin/(panel)/referrals/actions";

export function ReferralCreate() {
  const [state, action, pending] = useActionState<ReferralState, FormData>(createReferral, undefined);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_220px_auto]">
      <input name="name" placeholder="Название источника, например «Instagram — сторис»" className="field-box" required maxLength={80} />
      <input name="code" placeholder="Код (необязательно)" className="field-box" maxLength={40} pattern="[a-z0-9][a-z0-9\-]{1,39}" title="латиница, цифры, дефис" />
      <button className="btn btn-primary btn-sm" disabled={pending}>
        {pending ? "Создаём…" : "Создать ссылку"}
      </button>
      {state?.error && <p className="text-sm text-err sm:col-span-3">{state.error}</p>}
      {state?.created && <p className="text-sm text-ok sm:col-span-3">Ссылка создана: код «{state.created}»</p>}
    </form>
  );
}
