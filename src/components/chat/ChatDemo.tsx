"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { CHAT_CHANNELS, CHAT_FIXTURE_MESSAGES, CHAT_FIXTURE_MEETUP, validateChatDraft, resolveChatChannel, type ChatChannelId, type ChatMessage } from "@/lib/chat-demo";
import { mediaError } from "@/lib/chat-media";
import FeedRsvp from "@/components/FeedRsvp";
import styles from "./ChatDemo.module.css";

type Attachment = { id: string; name: string; url: string; size: number; channel: ChatChannelId };
type Message = ChatMessage & { attachments?: Attachment[] };
export type ChatInvite = { id: string; title: string; when: string; location: string; joined: boolean; hosting: boolean; started: boolean };
export default function ChatDemo({ initialChannel = "general", classLabel = "DEMO 101 · Professor Lumen", invites, preview = true }: { initialChannel?: ChatChannelId; classLabel?: string; invites?: ChatInvite[]; preview?: boolean }) {
  const [channel, setChannel] = useState<ChatChannelId>(resolveChatChannel(initialChannel));
  const [mediaView, setMediaView] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => preview ? [...CHAT_FIXTURE_MESSAGES] : []);
  const [drafts, setDrafts] = useState<Record<ChatChannelId, string>>({ general:"", homework:"", meetups:"" });
  const [files, setFiles] = useState<Record<ChatChannelId, File[]>>({ general:[], homework:[], meetups:[] });
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const urls = useRef<string[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => () => { urls.current.forEach(url => URL.revokeObjectURL(url)); }, []);
  useEffect(() => { if(log.current) log.current.scrollTop = log.current.scrollHeight; }, [messages, channel, mediaView]);
  const media = messages.flatMap(message => message.attachments || []);
  const meetupInvites = invites || (preview ? [{ id:"sample-meetup", title:CHAT_FIXTURE_MEETUP.title, when:CHAT_FIXTURE_MEETUP.when, location:CHAT_FIXTURE_MEETUP.location, joined:false, hosting:false, started:false }] : []);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selected = files[channel];
    const result = validateChatDraft(drafts[channel]);
    if (!result.ok && (drafts[channel].trim() || !selected.length)) { setError(result.error); return; }
    const invalid = mediaError(selected);
    if (invalid) { setError(invalid); return; }
    if (media.length + selected.length > 30 || media.reduce((sum,item) => sum + item.size,0) + selected.reduce((sum,item) => sum + item.size,0) > 50 * 1024 * 1024) { setError("This preview has reached its file limit. Reload to clear it before adding more files."); return; }
    const attachments = selected.map(file => { const url = URL.createObjectURL(file); urls.current.push(url); return { id:crypto.randomUUID(), name:file.name, size:file.size, url, channel }; });
    setMessages(current => [...current, { id:crypto.randomUUID(), channelId:channel, author:"You", text:result.ok ? result.text : "", timeLabel:"Local preview", kind:"local", attachments }]);
    setDrafts(current => ({...current,[channel]:""})); setFiles(current => ({...current,[channel]:[]}));
    setError(""); setStatus("Added to this preview. Not sent or uploaded.");
  }
  return <section className={styles.demo} id="chat-demo">
    <p className={styles.notice}>{preview ? "Sample class. " : ""}Messages and files stay in this preview and disappear when you leave or reload.{!preview && " Meetup RSVPs are saved to your account."}</p>
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link className={styles.link} href={preview ? "/preview/chat" : "/chats"}>← Choose class</Link>
        <p className={styles.course}>{classLabel}</p>
        <nav className={styles.channels} aria-label="Class channels">{CHAT_CHANNELS.map(item => <button key={item.id} className={styles.channel} aria-pressed={!mediaView && channel === item.id} onClick={() => { setChannel(item.id); setMediaView(false); setError(""); setStatus(""); }}># {item.id[0].toUpperCase() + item.id.slice(1)}</button>)}</nav>
        <button className={styles.mediaFolder} aria-pressed={mediaView} onClick={() => { setMediaView(true); setError(""); setStatus(""); }}>▱ Shared media <span>{media.length}</span></button>
      </aside>
      <div className={styles.conversation}>
        <header className={styles.channelHeader}><h2>{mediaView ? "Shared media" : channel[0].toUpperCase() + channel.slice(1)}</h2><p className={styles.muted}>{mediaView ? "Files from all channels in this class." : CHAT_CHANNELS.find(item => item.id === channel)?.description}</p></header>
        {mediaView ? <div className={styles.mediaList}>{media.length ? media.map(file => <a className={styles.fileCard} key={file.id} href={file.url} download={file.name}><strong>{file.name}</strong><span>#{file.channel} · {(file.size / 1024).toFixed(0)} KB · Download</span></a>) : <p className={styles.empty}>No files yet. Attach a file in any channel to find it here.</p>}</div> : <>
          <div className={styles.log} ref={log} role="log" aria-label={channel + " messages"} aria-live="polite" tabIndex={0}>
            {channel === "meetups" && meetupInvites.map(invite => <article className={styles.invite} key={invite.id}><span className={styles.eyebrow}>Meetup invite</span><h3>{invite.title}</h3><p>{invite.when}</p><p>{invite.location}</p>{preview ? <button disabled className={styles.submit}>RSVP · sample</button> : <FeedRsvp {...invite} />}</article>)}
            {!messages.some(message => message.channelId === channel) && !(channel === "meetups" && meetupInvites.length) && <p className={styles.empty}>No messages yet.</p>}
            <ol className={styles.messages}>{messages.filter(message => message.channelId === channel).map(message => <li className={styles.message} key={message.id}><span className={styles.avatar} aria-hidden="true">{message.author[0]}</span><div className={styles.messageBody}><div className={styles.messageMeta}><strong>{message.author}</strong><span>{message.timeLabel}</span></div>{message.text && <p className={styles.messageText}>{message.text}</p>}{message.attachments?.map(file => <a className={styles.fileCard} key={file.id} href={file.url} download={file.name}>{file.name}<span>Download · {(file.size / 1024).toFixed(0)} KB</span></a>)}</div></li>)}</ol>
          </div>
          <form className={styles.composer} onSubmit={submit}>
            <label htmlFor="chat-draft">Message #{channel}</label>
            <textarea id="chat-draft" value={drafts[channel]} maxLength={1000} placeholder="Write a message…" onChange={event => { setDrafts(current => ({...current,[channel]:event.target.value})); setError(""); }} onKeyDown={event => { if(event.key === "Enter" && (event.ctrlKey || event.metaKey) && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} />
            {files[channel].map((file,index) => <div className={styles.pendingFile} key={index}><span>{file.name}</span><button type="button" aria-label={"Remove " + file.name} onClick={() => setFiles(current => ({...current,[channel]:current[channel].filter((_,i) => i !== index)}))}>Remove</button></div>)}
            <input ref={fileInput} type="file" hidden multiple accept=".jpg,.jpeg,.png,.webp,.pdf,.txt" onChange={event => { const selected = [...files[channel],...Array.from(event.target.files || [])]; const invalid = mediaError(selected); if(invalid) setError(invalid); else { setFiles(current => ({...current,[channel]:selected})); setError(""); } event.target.value = ""; }} />
            <div className={styles.composeFooter}><button className={styles.attach} type="button" onClick={() => fileInput.current?.click()}>+ Attach file</button><button className={styles.submit}>Add to preview</button></div>
            <p className={styles.small}>Images, PDF, or text · up to 10 MB each</p>
            {error && <p role="alert" className={styles.error}>{error}</p>}{status && <p role="status" className={styles.status}>{status}</p>}
          </form>
        </>}
      </div>
    </div>
  </section>;
}
