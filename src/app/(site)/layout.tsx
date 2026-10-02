import { AnalyticsTracker } from "@/components/analytics/analytics-tracker";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { getContacts } from "@/lib/settings";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const contacts = await getContacts();
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-paper focus:px-4 focus:py-2 focus:text-ink">
        К содержимому
      </a>
      <Header phone={contacts.phone} phoneHref={contacts.phoneHref} />
      <main id="main">{children}</main>
      <Footer contacts={contacts} />
      <AnalyticsTracker metrikaId={process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID} />
    </>
  );
}
