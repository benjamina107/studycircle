import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("meetup lifecycle migration preserves cancellations and closes attendance", async () => {
  const sql = await readFile(new URL("../supabase/migrations/202609060001_meetup_lifecycle.sql", import.meta.url), "utf8");
  for (const phrase of [
    "add column if not exists cancelled_at timestamptz",
    "grant update(cancelled_at) on public.meetups to authenticated",
    "drop policy if exists join_meetup",
    "m.cancelled_at is null",
    "m.starts_at > now()",
    "public.is_subspace_member(m.subspace_id)",
  ]) assert.match(sql, new RegExp(phrase.replace(/[()]/g, "\\$&"), "i"));
});
