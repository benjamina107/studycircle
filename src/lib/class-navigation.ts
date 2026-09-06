export type ClassOption = { id: string; spaceId: string; code: string; title: string; professor: string; term: string };
export type ClassTab = "meetups" | "chat" | "files";
export const CLASS_TABS: { id: ClassTab; label: string }[] = [{ id: "meetups", label: "Meetups" }, { id: "chat", label: "Chat" }, { id: "files", label: "Files" }];
export function classHref(group: ClassOption, tab: ClassTab = "meetups") {
  return `/spaces/${encodeURIComponent(group.spaceId)}/${encodeURIComponent(group.id)}/${tab}`;
}
export function preferredClass(groups: ClassOption[], id?: string): ClassOption | undefined {
  return groups.find(group => group.id === id) || groups[0];
}
export function classFromPath(groups: ClassOption[], pathname: string): ClassOption | undefined {
  return groups.find(group => CLASS_TABS.some(tab => pathname === classHref(group, tab.id)));
}
export function tabFromPath(pathname: string): ClassTab {
  return CLASS_TABS.find(tab => pathname.endsWith(`/${tab.id}`))?.id || "meetups";
}
