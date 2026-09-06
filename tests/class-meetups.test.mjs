import assert from "node:assert/strict";
import { createRequire, Module } from "node:module";
import test from "node:test";
import { register } from "tsx/esm/api";
import { register as registerCjs } from "tsx/cjs/api";

register();
registerCjs();
const load = createRequire(import.meta.url);
const { validateCreation } = load("../src/features/class-meetups/validation.ts");
const now = Date.parse("2026-09-05T12:00:00Z");
const valid = { title: " Study together ", blurb: " Chapter 2 ", location: " Library ", date: "2099-09-06", time: "14:30" };
function form(values = valid) {
  const result = new FormData();
  for (const [key, value] of Object.entries(values)) result.set(key, value);
  return result;
}

test("creation validation uses campus timezone and trims text without requiring coordinates", () => {
  assert.deepEqual(validateCreation(form(), now), { ok: true, value: {
    title: "Study together", blurb: "Chapter 2", location_name: "Library", starts_at: "2099-09-06T21:30:00.000Z",
  } });
  assert.equal(validateCreation(form({ ...valid, date: "2099-01-06" }), now).value.starts_at, "2099-01-06T22:30:00.000Z");
});

test("validation rejects missing, oversized, non-string, duplicate, invalid and past values", () => {
  for (const changes of [
    { title: " " }, { title: "x".repeat(81) }, { blurb: "x".repeat(501) },
    { location: "" }, { location: "x".repeat(121) }, { date: "" }, { time: "" },
    { date: "2026-02-30" }, { date: "2026-09-04" }, { time: "25:00" },
    { date: "2027-03-14", time: "02:30" }, { date: "2026-11-01", time: "01:30" },
  ]) assert.equal(validateCreation(form({ ...valid, ...changes }), now).ok, false, JSON.stringify(changes));
  const duplicate = form(); duplicate.append("title", "second");
  assert.equal(validateCreation(duplicate, now).ok, false);
  const binary = form(); binary.set("blurb", new Blob(["hello"]));
  assert.equal(validateCreation(binary, now).ok, false);
  assert.equal(validateCreation(new FormData(), now).ok, false);
  assert.equal(validateCreation(form(), NaN).ok, false);
  assert.equal(validateCreation(form(), Date.parse("2099-09-06T21:30:00Z")).ok, false);
});

test("class meetup actions authenticate and enforce selected class membership", async t => {
  const replaced = new Map();
  function stub(path, exports) {
    const id = load.resolve(path); replaced.set(id, load.cache[id]);
    const entry = new Module(id); entry.exports = exports; entry.loaded = true; load.cache[id] = entry;
  }
  let results = [], calls = [], authCount = 0, authError = null, refreshes = 0;
  function query(table) {
    calls.push(["from", table]);
    const chain = {};
    for (const method of ["select", "eq", "maybeSingle", "insert", "delete"]) {
      chain[method] = (...args) => { calls.push([method, ...args]); return chain; };
    }
    chain.then = (resolve, reject) => {
      const result = results.shift();
      if (result instanceof Error) return Promise.reject(result).then(resolve, reject);
      assert.notEqual(result, undefined, "unexpected database query");
      return Promise.resolve(result).then(resolve, reject);
    };
    return chain;
  }
  stub("../src/lib/auth.ts", { requireUser: async () => { authCount++; if (authError) throw authError; return { id: "verified-user" }; } });
  stub("../src/lib/supabase/server.ts", { createClient: async () => ({ from: query, rpc: (...args) => { calls.push(["rpc", ...args]); return query("rpc"); } }) });
  stub("next/cache", { revalidatePath: (...args) => { calls.push(["revalidatePath", ...args]); refreshes++; } });
  // Resolve Next's bundled marker: no server-only package is installed directly.
  const accessPath = load.resolve("../src/features/class-meetups/access.ts");
  const originalLoad = Module._load;
  Module._load = function (request, ...args) { return request === "server-only" ? {} : originalLoad.call(this, request, ...args); };
  const allowed = () => [{ data: { id: "class" }, error: null }, { data: true, error: null }];
  const previous = { ok: false, message: "" };
  const meetup = { id: "meetup", creator_id: "host", starts_at: "2099-01-01T00:00:00Z" };
  const noWrites = () => assert.ok(!calls.some(([name]) => name === "insert" || name === "delete"));
  function reset(queue = []) { calls = []; results = queue; refreshes = 0; }
  try {
    const { createClassMeetup, classMeetupRsvp } = load("../src/features/class-meetups/actions.ts");
    await t.test("authentication redirects propagate and prevent all database work", async () => {
      reset(); authError = new Error("NEXT_REDIRECT");
      await assert.rejects(createClassMeetup("space", "class", previous, form()), /NEXT_REDIRECT/);
      await assert.rejects(classMeetupRsvp("space", "class", "meetup", previous, form({ intent: "join" })), /NEXT_REDIRECT/);
      authError = null; assert.equal(calls.length, 0); assert.equal(authCount, 2);
    });
    await t.test("invalid fields or IDs cannot write", async () => {
      reset(); assert.equal((await createClassMeetup("space", "class", previous, form({ ...valid, title: "" }))).ok, false);
      assert.equal((await createClassMeetup("../bad", "class", previous, form())).ok, false);
      assert.equal((await classMeetupRsvp("space", "class", "meetup", previous, form({ intent: "other" }))).ok, false);
      noWrites(); assert.equal(calls.length, 0);
    });
    await t.test("wrong parent, nonmembership and membership errors fail closed for both actions", async () => {
      for (const queue of [[{ data: null, error: null }], [{ error: { message: "secret" } }],
        [{ data: { id: "class" } }, { data: false }], [{ data: { id: "class" } }, { data: true, error: { message: "secret" } }]]) {
        for (const mutate of [() => createClassMeetup("space", "class", previous, form()),
          () => classMeetupRsvp("space", "class", "meetup", previous, form({ intent: "leave" }))]) {
          reset([...queue]); const result = await mutate();
          assert.equal(result.ok, false); assert.ok(!JSON.stringify(result).includes("secret")); noWrites();
          assert.ok(calls.some(call => call[0] === "eq" && call[1] === "space_id" && call[2] === "space"));
        }
      }
    });
    await t.test("creation inserts real data with verified identity, timezone and trigger-owned attendance", async () => {
      reset([...allowed(), { error: null }]);
      assert.equal((await createClassMeetup("space", "class", previous, form({ ...valid, creator_id: "spoof", subspace_id: "other", time_zone: "UTC" }))).ok, true);
      const insert = calls.find(call => call[0] === "insert")[1];
      assert.equal(insert.creator_id, "verified-user"); assert.equal(insert.subspace_id, "class");
      assert.equal(insert.time_zone, "America/Los_Angeles"); assert.equal(insert.title, "Study together");
      assert.ok(calls.some(call => call[0] === "rpc" && call[1] === "is_subspace_member" && call[2].target === "class"));
      assert.equal(calls.filter(call => call[0] === "insert").length, 1);
      assert.equal(refreshes, 1); assert.equal(results.length, 0);
    });
    await t.test("daily cap, missing migrations and provider failures never retry or leak errors", async () => {
      for (const code of ["P0001", "42703", "PGRST204", "42501", "23503"]) {
        reset([...allowed(), { error: { code, message: "secret SQL provider detail" } }]);
        const result = await createClassMeetup("space", "class", previous, form());
        assert.equal(result.ok, false); assert.ok(!JSON.stringify(result).includes("secret"));
        if (code === "P0001") assert.match(result.message, /5 meetups/);
        assert.equal(calls.filter(call => call[0] === "insert").length, 1); assert.equal(refreshes, 0);
      }
      reset([...allowed(), new Error("secret network error")]);
      assert.ok(!(await createClassMeetup("space", "class", previous, form())).message.includes("secret"));
    });
    await t.test("RSVP validates class, host and future start before writing", async () => {
      for (const data of [null, { ...meetup, creator_id: "verified-user" }, { ...meetup, starts_at: "2000-01-01" }, { ...meetup, starts_at: "invalid" }]) {
        reset([...allowed(), { data, error: null }]);
        assert.equal((await classMeetupRsvp("space", "class", "meetup", previous, form({ intent: "join" }))).ok, false);
        noWrites(); assert.ok(calls.some(call => call[0] === "eq" && call[1] === "subspace_id" && call[2] === "class"));
      }
    });
    await t.test("RSVP repeat joins are safe; cancellations are limited to verified user", async () => {
      reset([...allowed(), { data: meetup }, { error: { code: "23505" } }]);
      assert.equal((await classMeetupRsvp("space", "class", "meetup", previous, form({ intent: "join", user_id: "spoof" }))).ok, true);
      assert.deepEqual(calls.find(call => call[0] === "insert")[1], { meetup_id: "meetup", user_id: "verified-user" });
      reset([...allowed(), { data: meetup }, { error: null }]);
      assert.equal((await classMeetupRsvp("space", "class", "meetup", previous, form({ intent: "leave" }))).ok, true);
      assert.ok(calls.some(call => call[0] === "eq" && call[1] === "user_id" && call[2] === "verified-user"));
      assert.equal(refreshes, 1);
    });
    await t.test("failed RSVP writes are sanitized and never report success", async () => {
      reset([...allowed(), { data: meetup }, { error: { code: "42501", message: "secret" } }]);
      const result = await classMeetupRsvp("space", "class", "meetup", previous, form({ intent: "join" }));
      assert.equal(result.ok, false); assert.ok(!result.message.includes("secret")); assert.equal(refreshes, 0);
    });
  } finally {
    Module._load = originalLoad;
    delete load.cache[accessPath];
    for (const [id, original] of replaced) { if (original) load.cache[id] = original; else delete load.cache[id]; }
  }
});
