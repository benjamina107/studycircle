import assert from "node:assert/strict";
import { createRequire, Module } from "node:module";
import test from "node:test";

test("feed actions enforce identity, access, and honest mutation results", async (t) => {
  const load = createRequire(import.meta.url);
  const replaced = new Map<string, NodeModule | undefined>();
  function stub(path: string, exports: unknown) {
    const id = load.resolve(path);
    replaced.set(id, load.cache[id]);
    const entry = new Module(id); entry.exports = exports; entry.loaded = true; load.cache[id] = entry;
  }
  let results: unknown[] = [];
  const calls: { method: string; args: unknown[] }[] = [];
  let authCalls = 0;
  const query = () => {
    const chain: Record<string, unknown> = {};
    for (const method of ["select", "eq", "single", "insert", "delete", "order", "in", "limit", "upsert"]) chain[method] = (...args: unknown[]) => { calls.push({ method, args }); return chain; };
    chain.then = (resolve: (value: unknown) => void) => resolve(results.shift());
    return chain;
  };
  stub("./auth", { requireUser: async () => { authCalls++; return { id: "actual-user" }; } });
  stub("./supabase/server", { createClient: async () => ({ from: (table: string) => { calls.push({ method: "from", args: [table] }); return query(); } }) });
  stub("next/cache", { revalidatePath: () => {} });
  const fields = (values: Record<string, string>) => { const data = new FormData(); for (const [key, value] of Object.entries(values)) data.set(key, value); return data; };
  const previous = { ok: false, message: "" };
  const meetup = { id: "meetup", creator_id: "host", starts_at: "2099-01-01T00:00:00Z" };
  try {
    const { rsvp } = load("../app/(app)/spaces/actions");
    const { updateEnrollment } = load("../app/(app)/profile/enrollment-actions");
    await t.test("invalid action inputs perform no database operation", async () => {
      calls.length = 0;
      assert.equal((await rsvp(previous, fields({ meetup_id: "../bad", intent: "join" }))).ok, false);
      assert.equal((await updateEnrollment(previous, fields({ section_id: "section", intent: "replace-all" }))).ok, false);
      assert.equal(calls.length, 0);
      assert.equal(authCalls, 2);
    });
    await t.test("invisible, started and hosted meetups cannot be RSVPed", async () => {
      for (const data of [null, { ...meetup, starts_at: "2000-01-01T00:00:00Z" }, { ...meetup, creator_id: "actual-user" }]) {
        calls.length = 0; results = [{ data, error: null }];
        assert.equal((await rsvp(previous, fields({ meetup_id: "meetup", intent: "join" }))).ok, false);
        assert.ok(!calls.some(call => call.method === "insert"));
      }
    });
    await t.test("RSVP uses verified identity, not submitted identity, and repeats safely", async () => {
      calls.length = 0; results = [{ data: meetup, error: null }, { error: { code: "23505" } }];
      assert.equal((await rsvp(previous, fields({ meetup_id: "meetup", intent: "join", user_id: "someone-else" }))).ok, true);
      assert.deepEqual(calls.find(call => call.method === "insert")?.args, [{ meetup_id: "meetup", user_id: "actual-user" }]);
    });
    await t.test("RSVP cancellation is limited to the viewer", async () => {
      calls.length = 0; results = [{ data: meetup, error: null }, { error: null }];
      assert.equal((await rsvp(previous, fields({ meetup_id: "meetup", intent: "leave" }))).ok, true);
      assert.ok(calls.some(call => call.method === "eq" && call.args[0] === "user_id" && call.args[1] === "actual-user"));
    });
    await t.test("failed writes never claim successful RSVP or enrollment", async () => {
      results = [{ data: meetup, error: null }, { error: { code: "42501" } }];
      assert.equal((await rsvp(previous, fields({ meetup_id: "meetup", intent: "join" }))).ok, false);
      results = [{ error: { code: "23503" } }];
      assert.equal((await updateEnrollment(previous, fields({ section_id: "missing", intent: "add" }))).ok, false);
    });
    await t.test("enrollment removal is limited to the viewer and exact course/professor group", async () => {
      calls.length = 0; results = [{data:{course_id:"course",professor_id:"professor"},error:null},{data:[{id:"section"},{id:"sibling"}],error:null},{ error: null }];
      assert.equal((await updateEnrollment(previous, fields({ section_id: "section", intent: "remove", user_id: "someone-else" }))).ok, true);
      assert.ok(calls.some(call => call.method === "eq" && call.args[0] === "user_id" && call.args[1] === "actual-user"));
      assert.ok(calls.some(call => call.method === "eq" && call.args[0] === "course_id" && call.args[1] === "course"));
      assert.ok(calls.some(call => call.method === "eq" && call.args[0] === "professor_id" && call.args[1] === "professor"));
      assert.deepEqual(calls.find(call => call.method === "in")?.args,["section_id",["section","sibling"]]);
    });
    await t.test("an existing sibling enrollment prevents a duplicate group membership", async () => {
      calls.length=0; results=[{data:{course_id:"course",professor_id:"professor"},error:null},{data:[{id:"section"},{id:"sibling"}],error:null},{data:[{section_id:"sibling"}],error:null}];
      assert.equal((await updateEnrollment(previous,fields({section_id:"section",intent:"add"}))).ok,true);
      assert.ok(!calls.some(call=>call.method==="upsert"));
      assert.deepEqual(calls.find(call=>call.method==="in")?.args,["section_id",["section","sibling"]]);
    });
    await t.test("group lookup and removal failures never report success", async () => {
      for (const responses of [
        [{data:{course_id:"course",professor_id:"professor"},error:null},{data:null,error:{code:"42501"}}],
        [{data:{course_id:"course",professor_id:"professor"},error:null},{data:[{id:"section"}],error:null},{error:{code:"42501"}}],
      ]) {
        results=responses;
        assert.equal((await updateEnrollment(previous,fields({section_id:"section",intent:"remove"}))).ok,false);
      }
    });
  } finally { for (const [id, original] of replaced) { if (original) load.cache[id] = original; else delete load.cache[id]; } }
});
