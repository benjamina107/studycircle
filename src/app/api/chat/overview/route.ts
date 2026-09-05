import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return NextResponse.json({ error: "Sign in to use chats." }, { status: 401 });
  const { data: attendance, error: attendanceError } = await supabase.from("meetup_attendees").select("meetup_id").eq("user_id", userData.user.id);
  if (attendanceError) return NextResponse.json({ error: "Unable to load your joined meetups." }, { status: 500 });
  const [{ data: channels, error: channelError }, meetupResult] = await Promise.all([
    supabase.from("channels").select("id,name,subspace_id,subspaces!inner(id,space_id,professors(name),spaces!inner(id,courses!inner(code,title)))").order("name"),
    attendance.length ? supabase.from("meetups").select("id,title,location_name,starts_at,subspace_id,subspaces!inner(id,space_id)").in("id", attendance.map((row) => row.meetup_id)) : Promise.resolve({ data: [], error: null }),
  ]);
  if (channelError || meetupResult.error) return NextResponse.json({ error: "Unable to load your chats." }, { status: 500 });
  const channelRows = channels ?? [];
  return NextResponse.json({
    channels: (channels ?? []).map((row) => {
      const subspace = Array.isArray(row.subspaces) ? row.subspaces[0] : row.subspaces;
      const space = subspace && (Array.isArray(subspace.spaces) ? subspace.spaces[0] : subspace.spaces);
      const course = space && (Array.isArray(space.courses) ? space.courses[0] : space.courses);
      const professor = subspace && (Array.isArray(subspace.professors) ? subspace.professors[0] : subspace.professors);
      return { id: row.id, name: row.name, spaceId: subspace?.space_id ?? "", subspaceId: row.subspace_id, courseName: course?.code ?? course?.title ?? "Course", professorName: professor?.name ?? "Class" };
    }),
    meetups: (meetupResult.data ?? []).map((row) => {
      const subspace = Array.isArray(row.subspaces) ? row.subspaces[0] : row.subspaces;
      const channel = channelRows.find((candidate) => candidate.subspace_id === row.subspace_id && candidate.name === "general") ?? channelRows.find((candidate) => candidate.subspace_id === row.subspace_id);
      return channel ? { id: row.id, title: row.title, locationName: row.location_name, startsAt: row.starts_at, channelId: channel.id, spaceId: subspace?.space_id ?? "", subspaceId: row.subspace_id } : null;
    }).filter((row): row is NonNullable<typeof row> => row !== null),
  });
}
