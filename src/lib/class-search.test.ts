import assert from "node:assert/strict";
import { createRequire, Module } from "node:module";
import test from "node:test";
test("catalog search authenticates, combines filters, bounds results, and hides errors", async () => {
  const load = createRequire(import.meta.url);
  const originals = new Map<string, NodeModule | undefined>();
  function stub(path: string, exports: unknown) {
    const id = load.resolve(path); originals.set(id, load.cache[id]);
    const entry = new Module(id); entry.exports = exports; entry.loaded = true; load.cache[id] = entry;
  }
  const calls: { method: string; args: unknown[] }[] = [];
  let authCalls = 0, failure = false, denied = false;
  stub("./auth", { requireUser: async () => { authCalls++; if (denied) throw new Error("sign in"); return {id:"viewer"}; } });
  stub("./supabase/server", { createClient: async () => ({ from: (table: string) => {
    const chain: Record<string, unknown> = {};
    calls.push({method:"from",args:[table]});
    for (const method of ["select","or","ilike","order","limit","returns","eq"]) chain[method] = (...args: unknown[]) => { calls.push({method,args}); return chain; };
    chain.then = (resolve: (result: unknown)=>void) => resolve({data:table === "enrollments" ? [{section_id:"mine"}] : [],error:failure ? {message:"secret"} : null});
    return chain;
  } }) });
  try {
    const {searchClassSections} = load("../app/(app)/catalog-actions");
    assert.ok((await searchClassSections("","")).message);
    assert.equal(calls.length,0);
    assert.ok((await searchClassSections("x".repeat(61),"")).message);
    const result = await searchClassSections("CSC 202","Chen");
    assert.deepEqual(result.enrolledIds,["mine"]);
    assert.ok(calls.some(call=>call.method==="ilike" && call.args[0]==="professors.name" && call.args[1]==="%Chen%"));
    assert.ok(calls.some(call=>call.method==="or" && call.args[0]==="code.ilike.%CSC 202%,title.ilike.%CSC 202%"));
    assert.ok(calls.some(call=>call.method==="limit" && call.args[0]===30));
    assert.ok(calls.some(call=>call.method==="eq" && call.args[1]==="viewer"));
    failure = true;
    assert.equal((await searchClassSections("CSC","")).message,"Classes couldn’t be loaded. Please try again.");
    denied = true;
    await assert.rejects(searchClassSections("CSC",""), /sign in/);
    assert.equal(authCalls,5);
  } finally { for (const [id, entry] of originals) { if(entry) load.cache[id]=entry; else delete load.cache[id]; } }
});
