import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { requireUser } from "./auth";
import { chatClasses } from "./chat-classes";
import { preferredClass, type ClassOption } from "./class-navigation";

export const classContext = cache(async () => {
  const user = await requireUser();
  const groups = await chatClasses(user.id);
  const options: ClassOption[] = groups.map(group => ({ id: group.id, spaceId: group.space_id, code: group.spaces.courses.code, title: group.spaces.courses.title, professor: group.professors.name, term: group.spaces.courses.term }));
  options.sort((a,b) => a.code.localeCompare(b.code) || a.professor.localeCompare(b.professor) || a.id.localeCompare(b.id));
  const remembered = (await cookies()).get(`sc-group-${user.id}`)?.value;
  return { user, groups: options, selected: preferredClass(options, remembered) };
});
