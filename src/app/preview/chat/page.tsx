import Link from "next/link";
import ChatDemo from "@/components/chat/ChatDemo";
import { resolveChatChannel } from "@/lib/chat-demo";
import styles from "@/components/chat/ChatDemo.module.css";
export default async function ChatPreviewPage({searchParams}:{searchParams:Promise<{channel?:string|string[];class?:string}>}) {
  const query = await searchParams;
  const chosen = query.class === "demo101" || query.class === "demo202";
  return <div style={{background:"#f8f7f2",minHeight:"100dvh"}}><main className={`${styles.demo} ${styles.public}`}>
    <h1 className={styles.title}>Chats</h1>
    {chosen ? <ChatDemo key={query.class} initialChannel={resolveChatChannel(query.channel)} classLabel={query.class === "demo101" ? "DEMO 101 · Professor Lumen (sample)" : "DEMO 202 · Professor Rowan (sample)"} /> : <><p className={styles.muted}>Select a sample class to review the chat layout.</p><div className={styles.cards}>{["demo101","demo202"].map((id,index) => <Link key={id} className={styles.card} href={`/preview/chat?class=${id}`}><strong>DEMO {index === 0 ? "101" : "202"}</strong><p>{index === 0 ? "Professor Lumen" : "Professor Rowan"} · Sample class</p><p>General · Homework · Meetups →</p></Link>)}</div></>}
  </main></div>;
}
