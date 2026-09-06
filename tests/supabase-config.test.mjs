import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { register } from "tsx/cjs/api";

register();
const load = createRequire(import.meta.url);
const { getSupabaseConfig, isSupabaseConfigured } = load("../src/lib/supabase/config.ts");
const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

test("Supabase config accepts only browser-safe public key formats", () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_example";
  assert.equal(isSupabaseConfigured(), true);
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.signature";
  assert.equal(isSupabaseConfigured(), true);
  assert.equal(getSupabaseConfig().key, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_secret_not-allowed";
  assert.equal(isSupabaseConfigured(), false);
  assert.throws(() => getSupabaseConfig());
  if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  if (originalKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
});
