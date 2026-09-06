import assert from "node:assert/strict";
import test from "node:test";
import { preferredClass, classFromPath, classHref, tabFromPath, CLASS_TABS, type ClassOption } from "./class-navigation";
const groups: ClassOption[] = [
  {id:"prof-a",spaceId:"course-a",code:"CSC 101",title:"Programming",professor:"A",term:"Fall"},
  {id:"prof-b",spaceId:"course-a",code:"CSC 101",title:"Programming",professor:"B",term:"Fall"},
];
test("last opened exact professor group wins; missing or removed falls back", () => {
  assert.equal(preferredClass(groups,"prof-b"),groups[1]);
  assert.equal(preferredClass(groups,"removed"),groups[0]);
  assert.equal(preferredClass(groups),groups[0]);
  assert.equal(preferredClass([],"prof-a"),undefined);
});
test("class selection remains scoped to course and professor across all tabs", () => {
  for (const tab of CLASS_TABS) {
    assert.equal(classFromPath(groups,classHref(groups[1],tab.id)),groups[1]);
    assert.equal(tabFromPath(classHref(groups[1],tab.id)),tab.id);
  }
  assert.equal(classFromPath(groups,"/spaces/wrong/prof-b/chat"),undefined);
  assert.equal(classFromPath(groups,"/profile"),undefined);
  assert.equal(tabFromPath("/spaces"),"meetups");
});
test("route identifiers are URL encoded", () => {
  assert.equal(classHref({...groups[0],id:"a/b",spaceId:"a b"},"files"),"/spaces/a%20b/a%2Fb/files");
});
