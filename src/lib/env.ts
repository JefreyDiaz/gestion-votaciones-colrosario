const requiredEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};

export function getPublicSupabaseEnv() {
  if (!requiredEnv.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL en variables de entorno.");
  }

  if (!requiredEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Falta NEXT_PUBLIC_SUPABASE_ANON_KEY en variables de entorno.");
  }

  return {
    url: requiredEnv.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: requiredEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

export function getServiceRoleKey() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en variables de entorno.");
  }

  return serviceRoleKey;
}

export function getAdminAccessKey() {
  const adminAccessKey = process.env.ADMIN_ACCESS_KEY;
  if (!adminAccessKey) {
    throw new Error("Falta ADMIN_ACCESS_KEY en variables de entorno.");
  }

  return adminAccessKey;
}
