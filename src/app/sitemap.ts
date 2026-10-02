import type { MetadataRoute } from "next";
import { SERVICES } from "@/content/services";
import { db } from "@/lib/db";
import { publicSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicSiteUrl();
  const now = new Date();
  const staticPages = ["", "/projects", "/services", "/about", "/prices", "/reviews", "/contacts", "/request", "/privacy"].map((p) => ({
    url: `${base}${p}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.7,
  }));
  const projects = await db.project.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }).catch(() => []);
  return [
    ...staticPages,
    ...SERVICES.map((s) => ({ url: `${base}/services/${s.slug}`, lastModified: now, priority: 0.6 })),
    ...projects.map((p) => ({ url: `${base}/projects/${p.slug}`, lastModified: p.updatedAt, priority: 0.8 })),
  ];
}
