"use server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CourseSection } from "@/lib/feed";

export async function searchClassSections(course: string, professor: string, page = 0): Promise<{ sections: CourseSection[]; enrolledIds: string[]; total: number; pageSize: number; message?: string }> {
  const user = await requireUser();
  const pageSize = 8;
  if (!Number.isSafeInteger(page) || page < 0 || page > 10000) return {sections:[],enrolledIds:[],total:0,pageSize,message:"Invalid page."};
  if (typeof course !== "string" || typeof professor !== "string" || course.length > 60 || professor.length > 60) {
    return { sections: [], enrolledIds: [], total:0,pageSize, message: "Keep each search under 60 characters." };
  }
  const clean = (value: string) => value.replace(/[^\p{L}\p{N}\s'-]/gu, "").trim();
  const courseText = clean(course);
  const professorText = clean(professor);
  if (!courseText && !professorText) return { sections: [], enrolledIds: [], total:0,pageSize, message: "Enter a course or professor to search." };
  try {
    const db = await createClient();
    let query = db.from("courses").select("id,code,title,term,sections!inner(id,course_id,professor_id,section_code,professors!inner(name))",{count:"exact"});
    if (courseText) query = query.or(`code.ilike.%${courseText}%,title.ilike.%${courseText}%`);
    if (professorText) query = query.ilike("sections.professors.name", `%${professorText}%`);
    const [catalog, enrolled] = await Promise.all([
      query.order("code").order("id").range(page*pageSize,(page+1)*pageSize-1).returns<Array<{id:string;code:string;title:string;term:string;sections:Array<Omit<CourseSection,"courses">>}>>(),
      db.from("enrollments").select("section_id").eq("user_id", user.id),
    ]);
    if (catalog.error || enrolled.error) throw new Error();
    const sections: CourseSection[] = (catalog.data || []).flatMap(course => course.sections.map(section => ({...section,courses:{code:course.code,title:course.title,term:course.term}})));
    return { sections, enrolledIds: (enrolled.data || []).map(row => row.section_id),total:catalog.count||0,pageSize };
  } catch {
    return { sections: [], enrolledIds: [], total:0,pageSize, message: "Classes couldn’t be loaded. Please try again." };
  }
}
