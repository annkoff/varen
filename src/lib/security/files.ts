export const ALLOWED_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "webp"] as const;
export const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
export const MAX_FILES = 5;
export const ACCEPT_ATTR = ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp";

type Kind = "pdf" | "jpeg" | "png" | "webp";

const EXT_TO_KIND: Record<string, Kind> = { pdf: "pdf", jpg: "jpeg", jpeg: "jpeg", png: "png", webp: "webp" };
const KIND_TO_MIME: Record<Kind, string> = {
  pdf: "application/pdf",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export function extensionOf(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name);
  return m ? m[1].toLowerCase() : "";
}

/** Detects the real file type from magic bytes. */
export function sniffKind(bytes: Uint8Array): Kind | null {
  const b = bytes;
  if (b.length >= 5 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d) return "pdf";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a)
    return "png";
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50)
    return "webp";
  return null;
}

export type FileCheck = { ok: true; mime: string; ext: string } | { ok: false; error: string };

/** Extension, declared MIME type and actual content must all agree. */
export function validateUpload(name: string, declaredType: string, size: number, bytes: Uint8Array, maxBytes: number, imagesOnly = false): FileCheck {
  const ext = extensionOf(name);
  const extKind = EXT_TO_KIND[ext];
  if (!extKind || (imagesOnly && extKind === "pdf")) {
    return { ok: false, error: imagesOnly ? "Допустимы только JPG, PNG, WEBP" : "Допустимы только PDF, JPG, PNG, WEBP" };
  }
  if (size <= 0) return { ok: false, error: "Файл пустой" };
  if (size > maxBytes) return { ok: false, error: `Файл больше ${Math.round(maxBytes / 1024 / 1024)} МБ` };
  if (declaredType && !(ALLOWED_MIME as readonly string[]).includes(declaredType)) {
    return { ok: false, error: "Недопустимый тип файла" };
  }
  const real = sniffKind(bytes);
  if (!real || real !== extKind) return { ok: false, error: "Содержимое файла не соответствует расширению" };
  return { ok: true, mime: KIND_TO_MIME[real], ext: real === "jpeg" ? "jpg" : real };
}

/** Keeps a readable original name for managers but strips anything path-like or control chars. */
export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "file";
  const clean = base.replace(/[\u0000-\u001f<>:"|?*]/g, "").trim();
  return (clean || "file").slice(0, 150);
}
