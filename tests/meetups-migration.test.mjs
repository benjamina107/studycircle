import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("meetup migration defines the required database protections", async () => {
  const sql = await readFile(new URL("../supabase/migrations/202609050003_meetups.sql", import.meta.url), "utf8");

  for (const fragment of [
    "add column time_zone text not null",
    "create table public.meetup_daily_post_limits",
    "primary key (creator_id, post_date)",
    "on conflict (creator_id, post_date) do update",
    "where limits.post_count < 5",
    "create trigger validate_meetup",
    "create trigger z_enforce_meetup_post_limit",
    "create trigger add_meetup_creator_as_attendee",
    "drop policy join_meetup on public.meetup_attendees",
    "public.is_subspace_member(m.subspace_id)",
  ]) {
    assert.match(sql, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  }
});
