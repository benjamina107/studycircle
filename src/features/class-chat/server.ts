import type { SupabaseClient } from "@supabase/supabase-js";
import { assertSameOrigin, InputError, readJson } from "../../app/api/auth/validation";
import type { ClassFile } from "./types";

const fields = "id,channel_id,author_id,body,created_at,file_id";
const fileFields = "id,name,size,mime_type,created_at,uploader_id,subspace_id";
type Row = { id: string; channel_id: string; author_id: string | null; body: string; created_at: string; file_id: string | null };
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const unavailable = () => new InputError("Chat is temporarily unavailable. Please try again shortly.", 503);
function checked(error: unknown) { if (error) throw unavailable(); }
function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function output(row: Row, userId: string, file: ClassFile | null = null) {
  return { id: row.id, channelId: row.channel_id, authorId: row.author_id, authorName: row.author_id === userId ? "You" : "Classmate", body: row.body, createdAt: row.created_at, requestId: row.id, file };
}

export function createChatHandlers(createClient: () => Promise<SupabaseClient>) {
  async function context() {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw new InputError("Sign in to use chats.", 401);
    const user = data.user;
    if (!user.email_confirmed_at || user.is_anonymous || !/^[^\s@]+@calpoly\.edu$/i.test(user.email ?? "")) throw new InputError("Verify your Cal Poly email to use chats.", 403);
    return { supabase, user };
  }
  async function channelFor(supabase: SupabaseClient, id: string, subspaceId: string, name: string) {
    if (!id && (!subspaceId || !["general", "homework"].includes(name))) throw new InputError("Choose a class and chat channel.");
    let query = supabase.from("channels").select("id,subspace_id,name");
    query = id ? query.eq("id", id) : query.eq("subspace_id", subspaceId).eq("name", name);
    const { data, error } = await query.maybeSingle();
    checked(error);
    if (!data) throw new InputError("This channel is unavailable. Check your class enrollment.", 404);
    const member = await supabase.rpc("is_subspace_member", { target: data.subspace_id });
    checked(member.error);
    if (member.data !== true) throw new InputError("You must belong to this class to use its chat.", 403);
    return data as { id: string; subspace_id: string; name: string };
  }
  async function fileFor(supabase: SupabaseClient, id: string, subspaceId: string) {
    const { data, error } = await supabase.from("class_files").select(fileFields).eq("id", id).eq("subspace_id", subspaceId).maybeSingle();
    checked(error);
    if (!data) throw new InputError("This file is unavailable in this class.", 404);
    return data as ClassFile;
  }
  function handle(action: (request: Request) => Promise<Response>) {
    return async (request: Request) => {
      try { return await action(request); }
      catch (error) { return json({ error: error instanceof InputError ? error.message : "Chat is temporarily unavailable. Please try again shortly." }, error instanceof InputError ? error.status : 503); }
    };
  }
  return {
    GET: handle(async (request) => {
      // Same-origin GET fetches generally omit Origin. Reject explicitly foreign origins.
      if (request.headers.has("origin") || request.headers.get("sec-fetch-site") === "cross-site") assertSameOrigin(request);
      const { supabase, user } = await context();
      const params = new URL(request.url).searchParams;
      const legacy = text(params.get("channel"));
      const channel = await channelFor(supabase, legacy, text(params.get("subspaceId")), text(params.get("channelName")) || "general");
      const { data, error } = await supabase.from("messages").select(fields).eq("channel_id", channel.id).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(100);
      checked(error);
      const rows = (data ?? []) as Row[];
      const ids = [...new Set(rows.flatMap((row) => row.file_id ? [row.file_id] : []))];
      const attachments = new Map<string, ClassFile>();
      if (ids.length) {
        const result = await supabase.from("class_files").select(fileFields).eq("subspace_id", channel.subspace_id).in("id", ids);
        checked(result.error);
        for (const file of (result.data ?? []) as ClassFile[]) attachments.set(file.id, file);
      }
      const messages = rows.reverse().map((row) => output(row, user.id, attachments.get(row.file_id ?? "") ?? null));
      return json(legacy ? messages : { channel: { id: channel.id, name: channel.name }, messages });
    }),
    POST: handle(async (request) => {
      assertSameOrigin(request);
      const { supabase, user } = await context();
      const input = await readJson(request);
      const channelId = text(input.channelId);
      const requestId = text(input.requestId);
      const fileId = text(input.file_id);
      if (!channelId || channelId.length > 200 || !requestId || requestId.length > 200) throw new InputError("A channel and message retry ID are required.");
      if (input.file_id != null && (!fileId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fileId))) throw new InputError("Choose a valid class file.");
      if (input.body != null && typeof input.body !== "string") throw new InputError("Write a text message.");
      const channel = await channelFor(supabase, channelId, "", "");
      const file = fileId ? await fileFor(supabase, fileId, channel.subspace_id) : null;
      const body = text(input.body) || file?.name || "";
      if (!body || body.length > 2000) throw new InputError("Write a message between 1 and 2,000 characters, or attach a file.");
      const priorQuery = () => supabase.from("messages").select(fields).eq("id", requestId).eq("author_id", user.id).maybeSingle();
      const matches = (row: Row) => row.channel_id === channelId && row.body === body && (row.file_id ?? null) === (fileId || null);
      const prior = await priorQuery();
      checked(prior.error);
      if (prior.data) {
        if (matches(prior.data)) return json(output(prior.data, user.id, file));
        throw new InputError("This message retry ID is already in use.", 409);
      }
      const { data, error } = await supabase.from("messages").insert({ id: requestId, channel_id: channelId, author_id: user.id, body, file_id: fileId || null }).select(fields).single();
      if (error) {
        const existing = await priorQuery();
        if (existing.data && matches(existing.data)) return json(output(existing.data, user.id, file));
        if (error.code === "23505" || existing.data) throw new InputError("This message retry ID is already in use.", 409);
        if (error.code === "42501") throw new InputError("You cannot post in this channel. Check your class enrollment.", 403);
        if (error.code === "42900") throw new InputError("Posting limit reached. Try again in a minute.", 429);
        throw unavailable();
      }
      return json(output(data, user.id, file));
    }),
  };
}
