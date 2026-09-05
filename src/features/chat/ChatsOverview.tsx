"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ChatOverview } from "./types";
import { chatService } from "./live-service";
import { chatService as demoChatService } from "./mock-service";

export default function ChatsOverview({ demo = false }: { demo?: boolean }) {
  const [data, setData] = useState<ChatOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    (demo ? demoChatService : chatService).getChatsOverview(controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) {
          setData(value);
          setError(null);
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "Unable to load chats.");
        }
      });
    return () => controller.abort();
  }, [demo, retryToken]);

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <p>{error}</p>
        {!demo ? <p className="mt-2"><Link href="/chats?demo=1" className="font-semibold underline">Try the browser demo</Link></p> : null}
        <button type="button" onClick={() => setRetryToken((token) => token + 1)} className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-1.5 font-medium">
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return <p className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500">Loading your chats…</p>;
  }

  return (
    <div className="space-y-5 text-zinc-900 dark:text-zinc-100">
      {demo ? <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">Demo mode: sample enrollments and browser-only messages.</div> : <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-950">Want to preview chat? <Link href="/chats?demo=1" className="font-semibold underline">Try the demo</Link></div>}
      <section>
        <h1 className="mb-3 text-xl font-bold dark:text-zinc-100">Your channels</h1>
        {data.channels.length ? (
          <div className="space-y-2">
            {data.channels.map((channel) => (
                <Link key={channel.id} href={`/spaces/${channel.spaceId}/${channel.subspaceId}/chat?channel=${encodeURIComponent(channel.id)}${demo ? "&demo=1" : ""}`} className="block rounded-xl border border-zinc-200 bg-white p-4 text-zinc-900">
                <p className="font-medium"># {channel.name}</p>
                <p className="text-sm text-zinc-500">{channel.courseName} · {channel.professorName}</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500">No enrolled channels yet.</p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold dark:text-zinc-100">Joined meetups</h2>
        {data.meetups.length ? (
          <div className="space-y-2">
            {data.meetups.map((meetup) => (
              <Link key={meetup.id} href={`/spaces/${meetup.spaceId}/${meetup.subspaceId}/chat?channel=${encodeURIComponent(meetup.channelId)}${demo ? "&demo=1" : ""}`} className="block rounded-xl border border-zinc-200 bg-white p-4 text-zinc-900">
                <p className="font-medium">{meetup.title}</p>
                <p className="text-sm text-zinc-500">{meetup.locationName} · {new Date(meetup.startsAt).toLocaleString()}</p>
                <p className="mt-2 text-xs text-zinc-400">Open in its channel</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500">No joined meetups yet.</p>
        )}
      </section>
    </div>
  );
}
