import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { YandexMetrika } from "@/components/analytics/yandex-metrika";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-manrope",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "VAREN — строительство частных домов по всей России",
    template: "%s — VAREN",
  },
  description:
    "VAREN строит частные дома под ключ с 2005 года: архитектура, инженерия, внутренняя отделка и благоустройство участка. Работаем по всей России, с вашим проектом или по нашему.",
  applicationName: "VAREN",
  keywords: ["строительство домов", "дом под ключ", "загородный дом", "отделка", "ландшафт", "VAREN"],
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "VAREN",
    title: "VAREN — строительство частных домов по всей России",
    description: "Дома под ключ, отделка и благоустройство с 2005 года.",
    images: [{ url: "/images/og.jpg", width: 1200, height: 630, alt: "Дом, построенный VAREN" }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#0c0c0b",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={manrope.variable} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* Enables reveal animations only when JS runs, so content is never hidden for crawlers. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        {children}
        <YandexMetrika id={process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID} />
      </body>
    </html>
  );
}
