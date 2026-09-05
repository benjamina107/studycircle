"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { Channel, ChatOverview, MeetupPin } from "./types";
import { chatService } from "./live-service";
import { chatService as demoChatService } from "./mock-service";
import { useMessages } from "./useMessages";

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function MeetupPins({ meetups, spaceId, subspaceId, demo }: { meetups: MeetupPin[]; spaceId: string; subspaceId: string; demo: boolean }) {
  if (!meetups.length) return null;
  return <aside className="space-y-2" aria-label="Joined meetup pins">
    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Sample joined meetup</p>
    {meetups.map((meetup) => <Link key={meetup.id} href={`/spaces/${spaceId}/${subspaceId}/chat?channel=${encodeURIComponent(meetup.channelId)}${demo ? "&demo=1" : ""}`} className="block rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-indigo-950">
      <p className="font-medium">{meetup.title}</p><p className="text-sm text-indigo-800">{meetup.locationName} · {new Date(meetup.startsAt).toLocaleString()}</p><p className="mt-1 text-xs text-indigo-700">Pinned from your joined meetups · open its channel</p>
    </Link>)}
  </aside>;
}

function ChannelPanel({ channel, demo }: { channel: Channel; demo: boolean }) {
  const { messages, loading, pollError, sendError, sending, draft, setDraft, send } = useMessages(channel.id, demo);
  const listRef = useRef<HTMLDivElement>(null);
  const lastCount = useRef(0);
  const nearBottom = useRef(true);
  function onScroll() {
    const list = listRef.current;
    if (list) nearBottom.current = list.scrollHeight - list.scrollTop - list.clientHeight < 120;
  }
  useEffect(() => {
    const list = listRef.current;
    if (!list || messages.length <= lastCount.current) { lastCount.current = messages.length; return; }
    if (nearBottom.current) list.scrollTo({ top: list.scrollHeight, behavior: lastCount.current ? "smooth" : "auto" });
    lastCount.current = messages.length;
  }, [messages.length]);
  async function onSubmit(event: FormEvent) { event.preventDefault(); await send(); }
  return <section className="flex min-h-[60vh] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white text-zinc-900">
    <header className="border-b border-zinc-200 px-4 py-3"><h1 className="font-semibold"># {channel.name}</h1><p className="text-xs text-zinc-500">{channel.courseName} · {channel.professorName}</p></header>
    <div ref={listRef} onScroll={onScroll} className="max-h-[55vh] min-h-[18rem] flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
      {loading && !messages.length ? <p className="text-sm text-zinc-500">Loading messages…</p> : null}
      {!loading && !messages.length && !pollError ? <p className="text-center text-sm text-zinc-500">No messages yet. Start the conversation.</p> : null}
      {messages.map((message) => <article key={message.id} className="rounded-xl bg-zinc-50 px-3 py-2"><div className="flex items-baseline justify-between gap-2"><strong className="text-sm">{message.authorName}</strong><time className="text-[11px] text-zinc-400">{formatTime(message.createdAt)}</time></div><p className="whitespace-pre-wrap break-words text-sm text-zinc-700">{message.body}</p></article>)}
    </div>
    {pollError ? <p className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">{pollError}</p> : null}
    {sendError ? <p className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">{sendError} You can retry; your draft is preserved.</p> : null}
    <form onSubmit={onSubmit} className="border-t border-zinc-200 p-3"><label htmlFor={`chat-message-${channel.id}`} className="sr-only">Message</label><div className="flex items-end gap-2"><textarea id={`chat-message-${channel.id}`} value={draft} onChange={(event) => setDraft(event.target.value.slice(0, 2000))} maxLength={2000} rows={2} placeholder="Write a message…" className="min-w-0 flex-1 resize-none rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900" /><button type="submit" disabled={!draft.trim() || sending} className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">{sending ? "Sending…" : "Send"}</button></div><p className="mt-1 text-right text-[11px] text-zinc-400">{draft.length}/2000</p></form>
  </section>;
}

export default function ChatRoom({ spaceId, subspaceId, initialChannelId, demo = false }: { spaceId: string; subspaceId: string; initialChannelId?: string; demo?: boolean }) {
  const [overview, setOverview] = useState<ChatOverview | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>();
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [retryToken, setRetryToken] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    (demo ? demoChatService : chatService).getChatsOverview(controller.signal).then((value) => {
      if (controller.signal.aborted) return;
      setOverview(value); setOverviewLoading(false);
      setOverviewError(null);
      const valid = value.channels.filter((channel) => channel.spaceId === spaceId && channel.subspaceId === subspaceId);
      setSelectedId(valid.some((channel) => channel.id === initialChannelId) ? initialChannelId : valid[0]?.id);
    }).catch((cause) => { if (!controller.signal.aborted) { setOverviewError(cause instanceof Error ? cause.message : "Unable to load chats."); setOverviewLoading(false); } });
    return () => controller.abort();
  }, [demo, initialChannelId, retryToken, spaceId, subspaceId]);
  const channels = useMemo(() => overview?.channels.filter((channel) => channel.spaceId === spaceId && channel.subspaceId === subspaceId) ?? [], [overview, spaceId, subspaceId]);
  const selected = channels.find((channel) => channel.id === selectedId);
  const meetups = overview?.meetups.filter((meetup) => meetup.spaceId === spaceId && meetup.subspaceId === subspaceId) ?? [];
  if (overviewLoading) return <p className="rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-500">Loading your channels…</p>;
  if (overviewError) return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"><p>{overviewError}</p><button type="button" onClick={() => setRetryToken((token) => token + 1)} className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-1.5 font-medium">Retry</button></div>;
  return <div className="space-y-4">
    {demo ? <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">Demo mode: sample channels and browser-only messages.</div> : null}
    <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Enrolled channels">{channels.map((channel) => <Link key={channel.id} href={`/spaces/${spaceId}/${subspaceId}/chat?channel=${encodeURIComponent(channel.id)}${demo ? "&demo=1" : ""}`} onClick={() => setSelectedId(channel.id)} className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${selectedId === channel.id ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-900"}`}># {channel.name}</Link>)}</div>
    <MeetupPins meetups={meetups} spaceId={spaceId} subspaceId={subspaceId} demo={demo} />
    {!channels.length ? <p className="rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-500">No enrolled channels in this subspace yet.</p> : selected ? <ChannelPanel key={`${selected.id}-${demo ? "demo" : "live"}`} channel={selected} demo={demo} /> : null}
  </div>;
}
