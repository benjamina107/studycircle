import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("lecture upload migration requires teaching dates, private storage, and member policies", async () => {
  const sql = await readFile(new URL("../supabase/migrations/202609050005_lecture_uploads.sql", import.meta.url), "utf8");
  for (const fragment of ["create table public.term_teaching_periods", "'2026-08-24'", "'2026-12-11'", "generate_lecture_folders", "not public.is_subspace_member(target_subspace_id)", "insert into storage.buckets", "'lecture-notes'", "false, 10485760", "lecture_note_files_read", "lecture_note_files_upload", "split_part(name, '/', 2)"]) assert.match(sql, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
});
