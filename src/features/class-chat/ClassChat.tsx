"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { chatRequest, sendPending, type PendingMessage } from "./client";
import { useFillViewport } from "@/lib/use-fill-viewport";
import type { ClassFile, Conversation, Message } from "./types";
import styles from "./ClassChat.module.css";

const CHANNELS = [
  { id: "general", label: "General" },
  { id: "homework", label: "Homework" },
] as const;

function useDismiss(active: boolean, onDismiss: () => void, ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!active) return;
    function onClick(event: MouseEvent) { if (ref.current && !ref.current.contains(event.target as Node)) onDismiss(); }
    function onKey(event: globalThis.KeyboardEvent) { if (event.key === "Escape") onDismiss(); }
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("click", onClick); document.removeEventListener("keydown", onKey); };
  }, [active, onDismiss, ref]);
}

export default function ClassChat({ subspaceId }: { subspaceId: string }) {
  return subspaceId ? <ClassChannels key={subspaceId} subspaceId={subspaceId} /> : <p className={styles.empty}>Choose a class above to open its chat.</p>;
}

function ClassChannels({ subspaceId }: { subspaceId: string }) {
  const [channel, setChannel] = useState<string>("general");
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);
  const { sectionRef, height } = useFillViewport<HTMLElement>();
  const current = CHANNELS.find((entry) => entry.id === channel) ?? CHANNELS[0];

  useDismiss(switcherOpen, () => setSwitcherOpen(false), switcherRef);

  return <section ref={sectionRef} className={styles.chat} aria-label="Class chat" style={height ? { height } : undefined}>
    <header className={styles.header}>
      <div className={styles.switcher} ref={switcherRef}>
        <button type="button" className={styles.switcherButton} aria-haspopup="menu" aria-expanded={switcherOpen} onClick={() => setSwitcherOpen((value) => !value)}>
          <span className={styles.hash} aria-hidden="true">#</span>{current.label}
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
        </button>
        {switcherOpen && <ul className={styles.switcherMenu} role="menu" aria-label="Choose a channel">
          {CHANNELS.map((entry) => <li key={entry.id} role="none">
            <button type="button" role="menuitem" aria-current={entry.id === channel ? "true" : undefined} onClick={() => { setChannel(entry.id); setSwitcherOpen(false); }}>
              <span className={styles.hash} aria-hidden="true">#</span>{entry.label}
            </button>
          </li>)}
        </ul>}
      </div>
    </header>
    {CHANNELS.map((entry) => <div key={entry.id} className={styles.panel} hidden={channel !== entry.id}>
      <ChatConversation subspaceId={subspaceId} channelName={entry.id} channelLabel={entry.label} visible={channel === entry.id} />
    </div>)}
  </section>;
}

function ChatConversation({ subspaceId, channelName, channelLabel, visible }: { subspaceId: string; channelName: string; channelLabel: string; visible: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [channelId, setChannelId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [body, setBody] = useState("");
  const [file, setFile] = useState<ClassFile | null>(null);
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [files, setFiles] = useState<ClassFile[]>([]);
  const [picker, setPicker] = useState(false);
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesError, setFilesError] = useState("");
  const [sendError, setSendError] = useState("");
  const [busy, setBusy] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const pending = useRef<PendingMessage | null>(null);
  const sending = useRef(false);
  const active = useRef(true);
  const list = useRef<HTMLOListElement>(null);
  const nearBottom = useRef(true);
  const uploadInput = useRef<HTMLInputElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const attachWrap = useRef<HTMLDivElement>(null);

  useDismiss(attachOpen, () => setAttachOpen(false), attachWrap);

  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const result = await chatRequest<Conversation>(`/api/chat/messages?subspaceId=${encodeURIComponent(subspaceId)}&channelName=${channelName}`, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setChannelId(result.channel.id);
        setMessages(result.messages);
        setLoadError("");
      } catch (error) {
        if (controller.signal.aborted) return;
        // Clear protected content when access can no longer be established.
        setMessages([]); setChannelId("");
        setLoadError(error instanceof Error ? error.message : "Unable to load class chat.");
      } finally {
        if (!controller.signal.aborted) { setLoading(false); timer = setTimeout(poll, 5000); }
      }
    }
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [subspaceId, channelName, refresh, visible]);

  useEffect(() => {
    if (nearBottom.current && list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const el = textarea.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [body]);

  async function openFiles() {
    setPicker(true); setFilesLoading(true); setFilesError("");
    try {
      const result = await chatRequest<{ files: ClassFile[] }>(`/api/class-files?subspaceId=${encodeURIComponent(subspaceId)}`);
      if (active.current) setFiles(result.files.filter((entry) => entry.subspace_id === subspaceId));
    } catch (error) {
      if (active.current) { setFiles([]); setFilesError(error instanceof Error ? error.message : "Unable to load files."); }
    } finally { if (active.current) setFilesLoading(false); }
  }

  function edit() { pending.current = null; setSendError(""); }
  async function send(event: FormEvent) {
    event.preventDefault();
    if (sending.current || !channelId || (!body.trim() && !file && !localFile)) return;
    sending.current = true; setBusy(true); setSendError("");
    const draft = pending.current ?? { requestId: crypto.randomUUID(), channelId, subspaceId, body: body.trim(), localFile, file, uploaded: false };
    pending.current = draft;
    try {
      const message = await sendPending(draft, (uploaded) => { if (active.current) { setFile(uploaded); setLocalFile(null); } });
      if (!active.current) return;
      nearBottom.current = true;
      setMessages((previous) => [...previous.filter((entry) => entry.id !== message.id), message]);
      setBody(""); setFile(null); setLocalFile(null); pending.current = null;
      if (uploadInput.current) uploadInput.current.value = "";
      setRefresh((value) => value + 1);
    } catch (error) {
      if (active.current) setSendError(`${draft.uploaded ? "Your file is in Files, but the message was not confirmed. Retry send to use the same file without uploading again. " : ""}${error instanceof Error ? error.message : "Unable to send. Please retry."}`);
    } finally { sending.current = false; if (active.current) setBusy(false); }
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      form.current?.requestSubmit();
    }
  }

  const canSend = !busy && !!channelId && (!!body.trim() || !!file || !!localFile);

  return <>
    {loading && <div className={styles.status} role="status">Loading conversation…</div>}
    {loadError && <div className={styles.error} role="alert">{loadError} <button type="button" onClick={() => setRefresh((value) => value + 1)}>Try again</button></div>}
    {!loading && !loadError && messages.length === 0 && <div className={styles.empty}><h3>No messages yet</h3><p>Send a message to start this channel.</p></div>}
    <ol ref={list} className={styles.messages} aria-label={`${channelLabel} messages`} aria-live="polite" aria-relevant="additions" onScroll={() => { const el = list.current; if (el) nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}>
      {messages.map((message) => {
        const own = message.authorName === "You";
        return <li key={message.id} className={`${styles.message} ${own ? styles.own : styles.other}`}>
          <div className={styles.bubbleGroup}>
            {!own && <span className={styles.author}>{message.authorName}</span>}
            <div className={styles.bubble}>
              {message.body && <p>{message.body}</p>}
              {message.file && <a className={styles.attachment} href={`/api/class-files/${encodeURIComponent(message.file.id)}/download`}>↧ {message.file.name}<span>{formatSize(message.file.size)}</span></a>}
            </div>
            <time className={styles.time} dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time>
          </div>
        </li>;
      })}
    </ol>
    <form ref={form} className={styles.composer} onSubmit={send}>
      {(file || localFile) && <div className={styles.selected}>
        <span className={styles.attachName}>📎 {file?.name ?? localFile?.name}</span>
        <span className={styles.attachSize}>{formatSize((file?.size ?? localFile?.size) ?? 0)}</span>
        <button type="button" className={styles.removeAttachment} aria-label="Remove attachment" disabled={busy} onClick={() => { edit(); setFile(null); setLocalFile(null); if (uploadInput.current) uploadInput.current.value = ""; }}>×</button>
      </div>}
      {picker && <div className={styles.picker}>
        <div className={styles.pickerTitle}><strong>Choose a class file</strong><button type="button" onClick={() => setPicker(false)}>Close</button></div>
        {filesLoading ? <p role="status">Loading files…</p> : filesError ? <p role="alert">{filesError} <button type="button" onClick={() => void openFiles()}>Retry</button></p> : files.length === 0 ? <p>No files yet. Upload a file below to share it.</p> : <ul>{files.map((entry) => <li key={entry.id}><button type="button" disabled={busy} onClick={() => { edit(); setFile(entry); setLocalFile(null); setPicker(false); }}>{entry.name} <span>{formatSize(entry.size)}</span></button></li>)}</ul>}
      </div>}
      {sendError && <p className={styles.error} role="alert">{sendError}</p>}
      <div className={styles.composerRow}>
        <div className={styles.attachWrap} ref={attachWrap}>
          <input ref={uploadInput} type="file" className={styles.hidden} aria-label="Upload a file to attach" disabled={busy} onChange={(event) => { edit(); setLocalFile(event.target.files?.[0] ?? null); setFile(null); }} />
          <button type="button" className={styles.plusButton} aria-haspopup="menu" aria-expanded={attachOpen} aria-label="Attach a file" disabled={busy} onClick={() => setAttachOpen((value) => !value)}>
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          </button>
          {attachOpen && <div className={styles.attachMenu} role="menu">
            <button type="button" role="menuitem" onClick={() => { setAttachOpen(false); uploadInput.current?.click(); }}>Upload a file</button>
            <button type="button" role="menuitem" disabled={filesLoading} onClick={() => { setAttachOpen(false); void openFiles(); }}>Choose from Files</button>
          </div>}
        </div>
        <label htmlFor={`message-${channelName}`} className={styles.srOnly}>Message {channelLabel}</label>
        <textarea ref={textarea} id={`message-${channelName}`} value={body} disabled={busy} maxLength={2000} rows={1} placeholder={`Message #${channelName}`} onChange={(event) => { edit(); setBody(event.target.value); }} onKeyDown={onComposerKeyDown} />
        <button className={styles.sendButton} type="submit" disabled={!canSend} aria-label={busy ? (localFile ? "Uploading and sending" : "Sending") : sendError ? "Retry send" : "Send message"}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
        </button>
      </div>
      {body.length > 1800 && <p className={styles.count}>{body.length}/2,000</p>}
      <p className={styles.hint}>One file per message · Enter to send, Shift+Enter for a new line</p>
    </form>
  </>;
}

function formatSize(bytes: number) { return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`; }
