"use client";

import { useEffect } from "react";
import { migrateWatchHistory } from "@/lib/watch-history";

export function WatchHistoryMigration() {
  useEffect(() => { void migrateWatchHistory(); }, []);
  return null;
}
