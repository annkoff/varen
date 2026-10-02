import type { MetadataRoute } from "next";
import { publicSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const base = publicSiteUrl();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/request/success", "/r/"] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
