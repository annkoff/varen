"use client";

import { useState } from "react";

export function CopyButton({ value, label = "Копировать" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Fallback for non-secure contexts (http on a LAN IP).
      const ta = document.createElement("textarea");
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }
  return (
    <button type="button" onClick={copy} className="btn btn-outline btn-sm whitespace-nowrap" aria-live="polite">
      {copied ? "Скопировано ✓" : label}
    </button>
  );
}
