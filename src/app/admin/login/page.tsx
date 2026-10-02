import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { getCurrentAdmin } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Вход в админ-панель", robots: { index: false, follow: false } };

export default async function LoginPage() {
  if (await getCurrentAdmin()) redirect("/admin");
  return (
    <main className="flex min-h-[100svh] items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        <Logo className="h-5" />
        <h1 className="mt-10 text-3xl font-light tracking-tight">Админ-панель</h1>
        <p className="mt-2 text-sm text-mute">Доступ только для менеджеров VAREN.</p>
        <div className="mt-10">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
