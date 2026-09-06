"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { chatRequest, sendPending, type PendingMessage } from "./client";
import type { ClassFile, Conversation, Message } from "./types";
import styles from "./ClassChat.module.css";

export default function ClassChat({ subspaceId }: { subspaceId: string }) {
  return subspaceId ? <ClassChannels key={subspaceId} subspaceId={subspaceId} /> : <p className={styles.empty}>Choose a class above to open its chat.</p>;
}

function ClassChannels({ subspaceId }: { subspaceId: string }) {
  const [channel, setChannel] = useState("general");
  return <section className={styles.chat} aria-label="Class chat">
    <header className={styles.header}>
      <div><h1>Chat</h1><p>General discussion and homework questions.</p></div>
      <nav className={styles.channels} aria-label="Chat channels">
        {["general", "homework"].map((name) => <button key={name} type="button" aria-pressed={channel === name} onClick={() => setChannel(name)}>{name === "general" ? "General" : "Homework"}</button>)}
      </nav>
    </header>
    {["general", "homework"].map((name) => <div key={name} hidden={channel !== name}>
      <ChatConversation subspaceId={subspaceId} channelName={name} visible={channel === name} />
    </div>)}
  </section>;
}

function ChatConversation({ subspaceId, channelName, visible }: { subspaceId: string; channelName: string; visible: boolean }) {
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
  const pending = useRef<PendingMessage | null>(null);
  const sending = useRef(false);
  const active = useRef(true);
  const list = useRef<HTMLOListElement>(null);
  const nearBottom = useRef(true);
  const uploadInput = useRef<HTMLInputElement>(null);

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

  return <>
    {loading && <div className={styles.status} role="status">Loading conversation…</div>}
    {loadError && <div className={styles.error} role="alert">{loadError} <button type="button" onClick={() => setRefresh((value) => value + 1)}>Try again</button></div>}
    {!loading && !loadError && messages.length === 0 && <div className={styles.empty}><h3>No messages yet</h3><p>Send a message to start this channel.</p></div>}
    <ol ref={list} className={styles.messages} aria-label={`${channelName} messages`} aria-live="polite" aria-relevant="additions" onScroll={() => { const el = list.current; if (el) nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}>
      {messages.map((message) => <li key={message.id} className={styles.message}>
        <div className={styles.avatar} aria-hidden="true">{message.authorName === "You" ? "Y" : "C"}</div>
        <div className={styles.messageContent}><div className={styles.byline}><strong>{message.authorName}</strong><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time></div>
          <p>{message.body}</p>
          {message.file && <a className={styles.attachment} href={`/api/class-files/${encodeURIComponent(message.file.id)}/download`}>↧ {message.file.name}<span>{formatSize(message.file.size)}</span></a>}
        </div>
      </li>)}
    </ol>
    <form className={styles.composer} onSubmit={send}>
      <label htmlFor={`message-${channelName}`}>Message {channelName === "general" ? "General" : "Homework"}</label>
      <textarea id={`message-${channelName}`} value={body} disabled={busy} maxLength={2000} rows={3} placeholder="What’s on your mind?" onChange={(event) => { edit(); setBody(event.target.value); }} />
      {(file || localFile) && <div className={styles.selected}><span>Attached: {file?.name ?? localFile?.name}</span><button type="button" disabled={busy} onClick={() => { edit(); setFile(null); setLocalFile(null); if (uploadInput.current) uploadInput.current.value = ""; }}>Remove</button></div>}
      {picker && <div className={styles.picker}>
        <div className={styles.pickerTitle}><strong>Choose a class file</strong><button type="button" onClick={() => setPicker(false)}>Close</button></div>
        {filesLoading ? <p role="status">Loading files…</p> : filesError ? <p role="alert">{filesError} <button type="button" onClick={() => void openFiles()}>Retry</button></p> : files.length === 0 ? <p>No files yet. Upload a file below to share it.</p> : <ul>{files.map((entry) => <li key={entry.id}><button type="button" disabled={busy} onClick={() => { edit(); setFile(entry); setLocalFile(null); setPicker(false); }}>{entry.name} <span>{formatSize(entry.size)}</span></button></li>)}</ul>}
      </div>}
      {sendError && <p className={styles.error} role="alert">{sendError}</p>}
      <div className={styles.actions}>
        <input ref={uploadInput} type="file" className={styles.hidden} aria-label="Upload a file to attach" disabled={busy} onChange={(event) => { edit(); setLocalFile(event.target.files?.[0] ?? null); setFile(null); }} />
        <button type="button" disabled={busy} onClick={() => uploadInput.current?.click()}>Upload file</button>
        <button type="button" disabled={busy || filesLoading} onClick={() => void openFiles()}>Choose from Files</button>
        <span className={styles.count}>{body.length}/2,000</span>
        <button className={styles.send} type="submit" disabled={busy || !channelId || (!body.trim() && !file && !localFile)}>{busy ? localFile ? "Uploading & sending…" : "Sending…" : sendError ? "Retry send" : "Send"}</button>
      </div>
      <p className={styles.hint}>One file per message. Uploaded files are also available in the class Files tab.</p>
    </form>
  </>;
}

function formatSize(bytes: number) { return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`; }
