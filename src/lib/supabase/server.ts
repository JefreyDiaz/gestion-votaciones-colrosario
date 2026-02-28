import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { getPublicSupabaseEnv, getServiceRoleKey } from "@/lib/env";

export function createServerAnonClient() {
  const { url, anonKey } = getPublicSupabaseEnv();
  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function createServerServiceClient() {
  const { url } = getPublicSupabaseEnv();
  const serviceRoleKey = getServiceRoleKey();

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
