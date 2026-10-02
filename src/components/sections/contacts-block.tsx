import type { Contacts } from "@/content/site";
import { ContactsOpenTracker } from "./contacts-open-tracker";

export function MapEmbed({ address, className = "" }: { address: string; className?: string }) {
  const src = `https://yandex.ru/map-widget/v1/?text=${encodeURIComponent(address)}&z=16&l=map`;
  return (
    <div className={`relative overflow-hidden bg-ink-2 ${className}`}>
      <iframe
        src={src}
        title={`Карта: ${address}`}
        loading="lazy"
        className="map-dark absolute inset-0 h-full w-full border-0"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    </div>
  );
}

export function ContactsBlock({ contacts, heading = true }: { contacts: Contacts; heading?: boolean }) {
  return (
    <div className="grid gap-px bg-line lg:grid-cols-12">
      <ContactsOpenTracker />
      <div className="flex flex-col justify-between gap-12 bg-ink p-8 md:p-12 lg:col-span-5">
        <div>
          {heading && <p className="eyebrow mb-8">Офис в Москве</p>}
          <address className="not-italic">
            <p className="text-[clamp(1.6rem,3vw,2.4rem)] font-light leading-tight tracking-tight">{contacts.address}</p>
          </address>
          <p className="mt-6 text-sm text-mute">
            {contacts.hours}
            <br />
            {contacts.hoursNote}
          </p>
        </div>
        <div className="space-y-6">
          <div>
            <p className="eyebrow mb-2">Телефон</p>
            <a href={`tel:${contacts.phoneHref}`} className="link-underline text-2xl font-light">
              {contacts.phone}
            </a>
          </div>
          <div>
            <p className="eyebrow mb-2">Email</p>
            <a href={`mailto:${contacts.email}`} className="link-underline text-2xl font-light">
              {contacts.email}
            </a>
          </div>
        </div>
      </div>
      <MapEmbed address={contacts.address} className="min-h-[360px] lg:col-span-7 lg:min-h-[520px]" />
    </div>
  );
}
