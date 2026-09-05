"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, field: string) {
  return String(formData.get(field) ?? "").trim();
}

// datetime-local has no offset. Convert its wall-clock value using the zone the
// student explicitly selected, rather than the server's deployment time zone.
function zonedDateTimeToIso(value: string, timeZone: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error("Enter a valid date and time.");
  const [, year, month, day, hour, minute] = match;
  const target = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  let instant = target;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const values = Object.fromEntries(formatter.formatToParts(new Date(instant)).filter(({ type }) => type !== "literal").map(({ type, value: part }) => [type, part]));
    const rendered = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), Number(values.hour), Number(values.minute));
    instant += target - rendered;
  }
  const values = Object.fromEntries(formatter.formatToParts(new Date(instant)).filter(({ type }) => type !== "literal").map(({ type, value: part }) => [type, part]));
  if (`${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}` !== value) {
    throw new Error("That local time does not exist in the selected time zone.");
  }
  return new Date(instant).toISOString();
}

async function currentUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Sign in to manage meetups.");
  return { supabase, user };
}

export async function createMeetupAction(
  spaceId: string,
  subspaceId: string,
  formData: FormData,
) {
  const { supabase, user } = await currentUser();
  const title = text(formData, "title");
  const locationName = text(formData, "locationName");
  const startsAt = text(formData, "startsAt");
  const timeZone = text(formData, "timeZone");
  const blurb = text(formData, "blurb") || null;
  const latText = text(formData, "lat");
  const lngText = text(formData, "lng");
  const lat = latText ? Number(latText) : null;
  const lng = lngText ? Number(lngText) : null;

  if (!title || !locationName || !startsAt || !timeZone || (latText && !Number.isFinite(lat)) || (lngText && !Number.isFinite(lng))) {
    throw new Error("Enter a title, location, future date and time, time zone, and valid map coordinates.");
  }

  let startsAtIso: string;
  try {
    startsAtIso = zonedDateTimeToIso(startsAt, timeZone);
  } catch (error) {
    throw error instanceof Error ? error : new Error("Enter a valid date, time, and time zone.");
  }
  const { error } = await supabase.from("meetups").insert({
    subspace_id: subspaceId,
    creator_id: user.id,
    title,
    blurb,
    location_name: locationName,
    lat,
    lng,
    starts_at: startsAtIso,
    time_zone: timeZone,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/spaces/${spaceId}/${subspaceId}/meetups`);
  revalidatePath("/chats");
}

export async function joinMeetupAction(spaceId: string, subspaceId: string, meetupId: string) {
  const { supabase, user } = await currentUser();
  const { error } = await supabase.from("meetup_attendees").upsert(
    { meetup_id: meetupId, user_id: user.id },
    { onConflict: "meetup_id,user_id", ignoreDuplicates: true },
  );
  if (error) throw new Error(error.message);
  revalidatePath(`/spaces/${spaceId}/${subspaceId}/meetups`);
  revalidatePath("/chats");
}

export async function leaveMeetupAction(spaceId: string, subspaceId: string, meetupId: string) {
  const { supabase, user } = await currentUser();
  const { error } = await supabase.from("meetup_attendees").delete()
    .eq("meetup_id", meetupId).eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath(`/spaces/${spaceId}/${subspaceId}/meetups`);
  revalidatePath("/chats");
}

export async function removeAttendeeAction(spaceId: string, subspaceId: string, meetupId: string, attendeeId: string) {
  const { supabase } = await currentUser();
  const { error } = await supabase.from("meetup_attendees").delete()
    .eq("meetup_id", meetupId).eq("user_id", attendeeId);
  if (error) throw new Error(error.message);
  revalidatePath(`/spaces/${spaceId}/${subspaceId}/meetups`);
  revalidatePath("/chats");
}
