import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <main className="flex min-h-[100svh] flex-col">
      <header className="container-x flex h-20 items-center">
        <Link href="/" aria-label="VAREN — на главную">
          <Logo />
        </Link>
      </header>
      <div className="container-x flex flex-1 flex-col justify-center py-20">
        <p className="eyebrow mb-6">Ошибка 404</p>
        <h1 className="display max-w-3xl text-[clamp(2.6rem,7vw,6rem)]">Здесь пока ничего не построено</h1>
        <p className="lead-text mt-6 max-w-lg">Страница переехала или никогда не существовала. Начните с главной или посмотрите проекты.</p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/" className="btn btn-primary">
            На главную
          </Link>
          <Link href="/projects" className="btn btn-outline">
            Проекты
          </Link>
        </div>
      </div>
    </main>
  );
}
