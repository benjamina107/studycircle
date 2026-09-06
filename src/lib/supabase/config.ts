function isPublicClientKey(value: string | undefined) {
  // Supabase's newer publishable keys and existing legacy anon JWTs are both
  // safe browser credentials. Secret/service-role keys are never accepted.
  return !!value && (value.startsWith("sb_publishable_") || /^eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value));
}

export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL &&
    isPublicClientKey(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY));
}

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !isPublicClientKey(key)) {
    throw new Error("Set the Supabase URL and public client key in .env.local.");
  }
  return { url, key };
}
