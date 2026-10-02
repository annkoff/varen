"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/client";
import type { EventType } from "@/lib/analytics/events";

export function TrackOnMount({ type, label }: { type: EventType; label?: string }) {
  useEffect(() => {
    track(type, { label });
  }, [type, label]);
  return null;
}
