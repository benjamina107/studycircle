"use server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CourseSection } from "@/lib/feed";

export async function searchClassSections(course: string, professor: string): Promise<{ sections: CourseSection[]; enrolledIds: string[]; message?: string }> {
  const user = await requireUser();
  if (typeof course !== "string" || typeof professor !== "string" || course.length > 60 || professor.length > 60) {
    return { sections: [], enrolledIds: [], message: "Keep each search under 60 characters." };
  }
  const clean = (value: string) => value.replace(/[^\p{L}\p{N}\s'-]/gu, "").trim();
  const courseText = clean(course);
  const professorText = clean(professor);
  if (!courseText && !professorText) return { sections: [], enrolledIds: [], message: "Enter a course or professor to search." };
  try {
    const db = await createClient();
    let query = db.from("sections").select("id,section_code,courses!inner(code,title,term),professors!inner(name)");
    if (courseText) query = query.or(`code.ilike.%${courseText}%,title.ilike.%${courseText}%`, { referencedTable: "courses" });
    if (professorText) query = query.ilike("professors.name", `%${professorText}%`);
    const [catalog, enrolled] = await Promise.all([
      query.order("id").limit(30).returns<CourseSection[]>(),
      db.from("enrollments").select("section_id").eq("user_id", user.id),
    ]);
    if (catalog.error || enrolled.error) throw new Error();
    return { sections: catalog.data || [], enrolledIds: (enrolled.data || []).map(row => row.section_id) };
  } catch {
    return { sections: [], enrolledIds: [], message: "Classes couldn’t be loaded. Please try again." };
  }
}
