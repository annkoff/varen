"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, undefined);
  return (
    <form action={action} className="space-y-8">
      <div>
        <label htmlFor="email" className="field-label">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="username" required className="field" disabled={pending} />
      </div>
      <div>
        <label htmlFor="password" className="field-label">
          Пароль
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="field" disabled={pending} />
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-err">
          {state.error}
        </p>
      )}
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Проверяем…" : "Войти"}
      </button>
    </form>
  );
}
