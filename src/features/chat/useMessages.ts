"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "./types";
import { chatService } from "./live-service";
import { chatService as demoChatService } from "./mock-service";

const POLL_MS = 3000;
const MAX_BACKOFF_MS = 30000;

export function useMessages(channelId: string | undefined, demo = false) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(Boolean(channelId));
  const [pollError, setPollError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const requestChannel = useRef("");
  const sendRequest = useRef<AbortController | null>(null);
  const pendingRequestId = useRef<string | null>(null);
  const pendingBody = useRef<string | null>(null);
  const revision = useRef(0);
  const latestLoad = useRef(0);

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!channelId) return;
    const requestedChannel = channelId;
    const request = ++latestLoad.current;
    const startRevision = revision.current;
    try {
      const nextMessages = await (demo ? demoChatService : chatService).listMessages(requestedChannel, signal);
      if (requestChannel.current === requestedChannel && !signal?.aborted && request === latestLoad.current && startRevision === revision.current) {
        setMessages(nextMessages);
        setPollError(null);
      }
      return true;
    } catch (cause) {
      if (!signal?.aborted && requestChannel.current === requestedChannel && request === latestLoad.current) {
        setPollError(cause instanceof Error ? cause.message : "Unable to load messages.");
      }
      return false;
    }
  }, [channelId, demo]);

  useEffect(() => {
    requestChannel.current = channelId ?? "";
    if (!channelId) return;

    const controller = new AbortController();
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let delay = POLL_MS;

    const poll = async () => {
      if (stopped) return;
      if (document.visibilityState === "hidden") {
        timer = setTimeout(poll, POLL_MS);
        return;
      }
      const ok = await load(controller.signal);
      if (!stopped) setLoading(false);
      delay = ok ? POLL_MS : Math.min(delay * 2, MAX_BACKOFF_MS);
      if (!stopped) timer = setTimeout(poll, delay);
    };

    void poll();
    return () => {
      stopped = true;
      requestChannel.current = "";
      controller.abort();
      if (timer) clearTimeout(timer);
      sendRequest.current?.abort();
    };
  }, [channelId, load]);

  const send = useCallback(async () => {
    const body = draft.trim();
    if (!channelId || !body || body.length > 2000 || sendRequest.current) return false;
    const requestId = pendingRequestId.current && pendingBody.current === body ? pendingRequestId.current : crypto.randomUUID();
    pendingRequestId.current = requestId;
    pendingBody.current = body;
    const controller = new AbortController();
    sendRequest.current = controller;
    setSending(true);
    setSendError(null);
    try {
      const message = await (demo ? demoChatService : chatService).sendMessage({ channelId, body, requestId }, controller.signal);
      if (controller.signal.aborted || requestChannel.current !== channelId) return false;
      revision.current += 1;
      setMessages((current) => current.some((item) => item.requestId === requestId) ? current : [...current, message]);
      setDraft((current) => current === draft ? "" : current);
      pendingRequestId.current = null;
      pendingBody.current = null;
      return true;
    } catch (cause) {
      if (!controller.signal.aborted) setSendError(cause instanceof Error ? cause.message : "Unable to send message.");
      return false;
    } finally {
      if (sendRequest.current === controller) sendRequest.current = null;
      if (!controller.signal.aborted) setSending(false);
    }
  }, [channelId, draft, demo]);

  // The caller keys the channel panel by ID so drafts and retries never cross channels.
  return { messages, loading, pollError, sendError, sending, draft, setDraft, send, reload: load };
}
