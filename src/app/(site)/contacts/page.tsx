import type { Metadata } from "next";
import { LeadForm } from "@/components/lead/lead-form";
import { ContactsBlock } from "@/components/sections/contacts-block";
import { PageHero, Section } from "@/components/ui/primitives";
import { getContacts, getPricing } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Контакты",
  description: "Офис VAREN: Москва, ул. Волхонка, 15. Телефон, email, часы работы и карта проезда.",
  alternates: { canonical: "/contacts" },
};

export default async function ContactsPage() {
  const [contacts, pricing] = await Promise.all([getContacts(), getPricing()]);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    name: "VAREN",
    foundingDate: "2005",
    telephone: contacts.phoneHref,
    email: contacts.email,
    address: { "@type": "PostalAddress", streetAddress: "ул. Волхонка, 15", addressLocality: "Москва", addressCountry: "RU" },
    areaServed: "RU",
    openingHours: "Mo-Fr 09:00-20:00, Sa 10:00-17:00",
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <PageHero bg="/images/backgrounds/white-villa.webp" eyebrow="Контакты" title="Приезжайте, звоните, пишите" text="Офис в центре Москвы, напротив Пушкинского музея. Покажем образцы материалов и расскажем о проектах." />
      <Section>
        <ContactsBlock contacts={contacts} />
      </Section>
      <Section className="border-t border-line">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="eyebrow mb-6">Написать нам</p>
            <h2 className="h-section">Короткая заявка</h2>
            <p className="mt-6 text-[15px] leading-relaxed text-mute">Оставьте контакты — перезвоним и ответим на вопросы. Подробности можно добавить позже.</p>
          </div>
          <div className="lg:col-span-7 lg:col-start-6">
            <LeadForm pricing={pricing} maxMb={Number(process.env.MAX_UPLOAD_MB) || 10} initialServices={["consultation"]} />
          </div>
        </div>
      </Section>
    </>
  );
}
