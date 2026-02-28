"use client";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { getPublicSupabaseEnv } from "@/lib/env";

let browserClient: ReturnType<typeof createClient<Database>> | undefined;

export function createBrowserClient() {
  if (browserClient) {
    return browserClient;
  }

  const { url, anonKey } = getPublicSupabaseEnv();
  browserClient = createClient<Database>(url, anonKey);
  return browserClient;
}
