import { Notes } from "@/components/study/ClassWorkspace";
import { requireUser } from "@/lib/auth";
import styles from "@/features/class-chat/ClassChat.module.css";
export default async function Page({params}: {params: Promise<{subspaceId:string}>}) {
 const {subspaceId} = await params;
 const user = await requireUser();
 return <section className={styles.chat}><header className={styles.header}><div><h1>Files</h1><p>Shared notes and recordings for your class and ClassAI.</p></div></header><Notes key={subspaceId} subspace={subspaceId} userId={user.id}/></section>;
}
