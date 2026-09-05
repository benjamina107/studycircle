import "server-only";
import { createClient } from "./supabase/server";
export type ChatClass = { id: string; space_id: string; professor_id: string; professors: { name: string }; spaces: { course_id: string; courses: { code: string; title: string; term: string } } };
export async function chatClasses(userId: string): Promise<ChatClass[]> {
  const db = await createClient();
  const enrollment = await db.from("enrollments").select("sections!inner(course_id,professor_id)").eq("user_id",userId).returns<{ sections: { course_id: string; professor_id: string } }[]>();
  if (enrollment.error) throw new Error("Class lookup failed");
  const memberships = enrollment.data || [];
  if (!memberships.length) return [];
  const groups = await db.from("subspaces").select("id,space_id,professor_id,professors!inner(name),spaces!inner(course_id,courses!inner(code,title,term))").in("professor_id", [...new Set(memberships.map(item => item.sections.professor_id))]).returns<ChatClass[]>();
  if (groups.error) throw new Error("Class lookup failed");
  return (groups.data || []).filter(group => memberships.some(item => item.sections.course_id === group.spaces.course_id && item.sections.professor_id === group.professor_id));
}
