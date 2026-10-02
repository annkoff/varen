import type { Metadata } from "next";
import Image from "next/image";
import { blurProps } from "@/lib/images";
import { LeadForm } from "@/components/lead/lead-form";
import { LEAD_SERVICES } from "@/content/services";
import { db } from "@/lib/db";
import { getContacts, getPricing } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Заявка",
  description: "Оставьте заявку на строительство дома, отделку или благоустройство. Приложите проект, планировки или референсы — ответим в течение рабочего дня.",
  alternates: { canonical: "/request" },
};

export default async function RequestPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const [pricing, contacts] = await Promise.all([getPricing(), getContacts()]);
  const service = typeof sp.service === "string" && LEAD_SERVICES.some((s) => s.id === sp.service) ? [sp.service] : [];
  const projectSlug = typeof sp.project === "string" ? sp.project.slice(0, 100) : null;
  const project = projectSlug ? await db.project.findFirst({ where: { slug: projectSlug, published: true }, select: { title: true } }) : null;
  const maxMb = Number(process.env.MAX_UPLOAD_MB) || 10;

  return (
    <section className="pb-24 pt-32 md:pb-32 md:pt-44">
      <div className="container-x grid gap-16 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <p className="eyebrow mb-6">Заявка</p>
          <h1 className="display text-[clamp(2.6rem,5.5vw,4.8rem)]">Расскажите о своём доме</h1>
          <p className="lead-text mt-6">Менеджер перезвонит в течение рабочего дня, уточнит детали и предложит время встречи.</p>
          <div className="relative mt-12 hidden aspect-[4/5] overflow-hidden lg:block">
            <Image src="/images/photos/ph-74.webp" {...blurProps("/images/photos/ph-74.webp")} alt="" fill sizes="30vw" quality={85} className="object-cover" />
          </div>
          <div className="mt-10 space-y-2 text-sm text-mute">
            <p>Удобнее позвонить?</p>
            <a href={`tel:${contacts.phoneHref}`} className="block text-xl font-light text-paper">
              {contacts.phone}
            </a>
          </div>
        </div>
        <div className="lg:col-span-7 lg:col-start-6">
          <LeadForm pricing={pricing} maxMb={maxMb} initialServices={project ? ["construction"] : service} initialDescription={project ? `Интересует проект «${project.title}».` : ""} />
        </div>
      </div>
    </section>
  );
}
