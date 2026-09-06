import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("sample catalog creates usable spaces, professor subspaces, and channels", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,is_anonymous boolean default false,raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema public,auth to anon,authenticated;
      grant execute on function auth.uid() to anon,authenticated;`);
    for (const file of ["202609050001_initial.sql", "202609050002_domain.sql", "202609050008_sample_catalog.sql"]) {
      await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), "utf8"));
    }
    assert.equal((await db.query("select count(*)::int n from courses where term='Fall 2026'")).rows[0].n, 8);
    assert.equal((await db.query("select count(*)::int n from sections")).rows[0].n, 7);
    assert.equal((await db.query("select count(*)::int n from subspaces")).rows[0].n, 7);
    assert.equal((await db.query("select count(*)::int n from channels")).rows[0].n, 21);
    await db.exec(await readFile(new URL("../supabase/migrations/202609050008_sample_catalog.sql", import.meta.url), "utf8"));
    assert.equal((await db.query("select count(*)::int n from channels")).rows[0].n, 21, "seed is idempotent");
  } finally { await db.close(); }
});
