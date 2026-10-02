import blur from "@/content/blur-placeholders.json";

const map = blur as Record<string, string>;

/**
 * Props for next/image: a blurred preview while the photo loads (no empty boxes).
 * Images uploaded via the admin have no pre-built preview and fall back to the surface color.
 */
export function blurProps(url: string): { placeholder?: "blur"; blurDataURL?: string } {
  const data = map[url];
  return data ? { placeholder: "blur", blurDataURL: data } : {};
}
