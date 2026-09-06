import assert from "node:assert/strict";
import { createRequire, Module } from "node:module";
import test from "node:test";

test("remembered group is validated against this account's enrollment", async () => {
  const load = createRequire(import.meta.url);
  const originals = new Map<string, NodeModule | undefined>();
  function stub(path: string, exports: unknown) {
    const id = load.resolve(path);
    originals.set(id, load.cache[id]);
    const entry = new Module(id); entry.exports = exports; entry.loaded = true; load.cache[id] = entry;
  }
  const writes: unknown[][] = [];
  let existing: string | undefined;
  let fail = false;
  stub("./class-context", { classContext: async () => {
    if (fail) throw new Error("private backend detail");
    return {user: {id:"actual-user"}, groups: [{id:"my-group"}]};
  } });
  stub("next/headers", { cookies: async () => ({
    get: () => existing ? {value:existing} : undefined,
    set: (...args: unknown[]) => writes.push(args),
  }) });
  try {
    const {rememberClass} = load("../app/(app)/class-actions");
    assert.equal(await rememberClass("other-professor"),false);
    assert.equal(await rememberClass({id:"my-group"}),false);
    assert.equal(writes.length,0);
    assert.equal(await rememberClass("my-group"),true);
    assert.equal(writes[0][0],"sc-group-actual-user");
    assert.equal(writes[0][1],"my-group");
    assert.equal((writes[0][2] as {httpOnly:boolean}).httpOnly,true);
    existing = "my-group";
    assert.equal(await rememberClass("my-group"),true);
    assert.equal(writes.length,1);
    fail = true;
    assert.equal(await rememberClass("my-group"),false);
    assert.equal(writes.length,1);
  } finally {
    for (const [id, entry] of originals) { if (entry) load.cache[id] = entry; else delete load.cache[id]; }
  }
});
