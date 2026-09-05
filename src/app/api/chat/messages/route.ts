import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function output(row: { id: string; channel_id: string; author_id: string; body: string; created_at: string }, currentUser: string) {
  return { id: row.id, channelId: row.channel_id, authorId: row.author_id, authorName: row.author_id === currentUser ? "You" : "Classmate", body: row.body, createdAt: row.created_at, requestId: row.id };
}

async function currentClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  return error || !data.user ? null : { supabase, user: data.user };
}

export async function GET(request: Request) {
  const context = await currentClient();
  if (!context) return NextResponse.json({ error: "Sign in to use chats." }, { status: 401 });
  const channel = new URL(request.url).searchParams.get("channel")?.trim();
  if (!channel) return NextResponse.json({ error: "A channel is required." }, { status: 400 });
  const { data: channelRow, error: channelError } = await context.supabase.from("channels").select("id").eq("id", channel).maybeSingle();
  if (channelError || !channelRow) return NextResponse.json({ error: "This channel is unavailable." }, { status: 404 });
  const { data, error } = await context.supabase.from("messages").select("id,channel_id,author_id,body,created_at").eq("channel_id", channel).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: "Unable to load messages." }, { status: 500 });
  return NextResponse.json((data ?? []).reverse().map((row) => output(row, context.user.id)));
}

export async function POST(request: Request) {
  const context = await currentClient();
  if (!context) return NextResponse.json({ error: "Sign in to use chats." }, { status: 401 });
  const input = await request.json().catch(() => null) as { channelId?: unknown; body?: unknown; requestId?: unknown } | null;
  const channelId = typeof input?.channelId === "string" ? input.channelId.trim() : "";
  const body = typeof input?.body === "string" ? input.body.trim() : "";
  const requestId = typeof input?.requestId === "string" ? input.requestId.trim() : "";
  if (!channelId || !requestId || body.length < 1 || body.length > 2000) return NextResponse.json({ error: "Write a message between 1 and 2,000 characters." }, { status: 400 });
  const prior = await context.supabase.from("messages").select("id,channel_id,author_id,body,created_at").eq("id", requestId).eq("author_id", context.user.id).maybeSingle();
  if (prior.data) {
    if (prior.data.channel_id === channelId && prior.data.body === body) return NextResponse.json(output(prior.data, context.user.id));
    return NextResponse.json({ error: "This message retry ID is already in use." }, { status: 409 });
  }
  const { data, error } = await context.supabase.from("messages").insert({ id: requestId, channel_id: channelId, author_id: context.user.id, body }).select("id,channel_id,author_id,body,created_at").single();
  if (error) {
    // A concurrent retry can lose the insert race, or hit the limit after the
    // first request committed. Always re-read the id before surfacing failure.
    const existing = await context.supabase.from("messages").select("id,channel_id,author_id,body,created_at").eq("id", requestId).eq("author_id", context.user.id).maybeSingle();
    if (existing.data && existing.data.channel_id === channelId && existing.data.body === body) return NextResponse.json(output(existing.data, context.user.id));
    if (error.code === "23505" || existing.data) return NextResponse.json({ error: "This message retry ID is already in use." }, { status: 409 });
    const status = error.code === "42501" ? 403 : error.code === "42900" ? 429 : 400;
    return NextResponse.json({ error: status === 429 ? "Posting limit reached. Try again in a minute." : "You cannot post in this channel." }, { status });
  }
  return NextResponse.json(output(data, context.user.id));
}
