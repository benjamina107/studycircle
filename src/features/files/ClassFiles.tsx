"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { ClassFile, ClassFilesPage } from "./types";
import { FILE_ACCEPT, validateFile } from "./validation";
import { fileClientMessage, requestFileJson } from "./client";
import styles from "./ClassFiles.module.css";

export default function ClassFiles({ subspaceId }: { subspaceId: string }) {
  // Remount class-local state immediately on navigation; late requests cannot fill another class.
  return <FilesForClass key={subspaceId} subspaceId={subspaceId} />;
}

function FilesForClass({ subspaceId }: { subspaceId: string }) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const active = useRef(true);
  const [files, setFiles] = useState<ClassFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [moreError, setMoreError] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [selected, setSelected] = useState<File | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    active.current = true;
    const abort = new AbortController();
    async function load() {
      setLoading(true);
      setLoadError("");
      setMoreError("");
      try {
        const result = await requestFileJson<ClassFilesPage>(`/api/class-files?subspaceId=${encodeURIComponent(subspaceId)}`, { cache: "no-store", signal: abort.signal }, "Files are temporarily unavailable. Please try again later.");
        if (!Array.isArray(result.files)) throw new Error();
        if (!abort.signal.aborted) { setFiles(result.files); setNextCursor(result.hasMore ? result.nextCursor : null); }
      } catch (error) {
        if (!abort.signal.aborted) setLoadError(fileClientMessage(error, "Files are temporarily unavailable. Please try again later."));
      } finally { if (!abort.signal.aborted) setLoading(false); }
    }
    void load();
    return () => { active.current = false; abort.abort(); };
  }, [subspaceId, refresh]);

  async function loadMore() {
    if (!nextCursor || loadingMore || pending) return;
    setLoadingMore(true);
    setMoreError("");
    try {
      const params = new URLSearchParams({ subspaceId, cursor: nextCursor });
      const result = await requestFileJson<ClassFilesPage>(`/api/class-files?${params}`, { cache: "no-store" }, "We couldn’t load more files. Please try again.");
      if (!Array.isArray(result.files)) throw new Error();
      if (!active.current) return;
      setFiles((current) => [...current, ...result.files.filter((file) => !current.some((existing) => existing.id === file.id))]);
      setNextCursor(result.hasMore ? result.nextCursor : null);
    } catch (error) {
      if (active.current) setMoreError(fileClientMessage(error, "We couldn’t load more files. Please try again."));
    } finally { if (active.current) setLoadingMore(false); }
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || pending) return;
    setUploadError("");
    setNotice("");
    try { validateFile(selected); }
    catch (error) { setUploadError((error as Error).message); return; }
    setPending(true);
    const form = new FormData();
    form.set("subspaceId", subspaceId);
    form.set("file", selected);
    try {
      const result = await requestFileJson<{ file: ClassFile }>("/api/class-files", { method: "POST", body: form }, "We couldn’t confirm your upload. Refresh the file list before retrying.");
      if (!result.file?.id) throw new Error();
      if (!active.current) return;
      setFiles((current) => [result.file, ...current.filter((file) => file.id !== result.file.id)]);
      setSelected(null);
      if (input.current) input.current.value = "";
      setNotice(`${result.file.name} is ready for your class.`);
    } catch (error) {
      if (active.current) setUploadError(fileClientMessage(error, "We couldn’t confirm your upload. Refresh the file list before retrying."));
    } finally { if (active.current) setPending(false); }
  }

  return (
    <section className={styles.panel} aria-label="Class files">
      <div className={styles.heading}>
        <div><h1>Files</h1><p>Notes and resources, shared with this class.</p></div>
        <button type="button" className={styles.secondary} disabled={loading || pending || loadingMore} onClick={() => setRefresh((value) => value + 1)}>Refresh</button>
      </div>
      <form className={styles.upload} onSubmit={upload} aria-busy={pending}>
        <label htmlFor={inputId}>Share a file</label>
        <p id={`${inputId}-help`}>PDF, PNG, JPEG, TXT, or CSV · up to 10 MiB · class members only</p>
        <div className={styles.controls}>
          <input ref={input} id={inputId} type="file" accept={FILE_ACCEPT} disabled={pending || loading || loadingMore || !!loadError}
            aria-describedby={`${inputId}-help`} onChange={(event) => { setSelected(event.target.files?.[0] ?? null); setUploadError(""); setNotice(""); }} />
          <button type="submit" disabled={!selected || pending || loading || loadingMore || !!loadError}>{pending ? "Uploading…" : "Upload file"}</button>
        </div>
        {pending && <p role="status">Uploading {selected?.name}. Keep this page open until it finishes.</p>}
        {uploadError && <p className={styles.error} role="alert">{uploadError}</p>}
        {notice && <p role="status">{notice}</p>}
      </form>
      {loading ? <p className={styles.empty} role="status">Loading class files…</p> : loadError ? (
        <div className={styles.empty} role="alert"><p>{loadError}</p><button className={styles.secondary} onClick={() => setRefresh((value) => value + 1)}>Try again</button></div>
      ) : files.length === 0 ? <div className={styles.empty}><h3>No files yet</h3><p>Share the first set of notes or a useful handout.</p></div> : (
        <ul className={styles.list}>{files.map((file) => (
          <li key={file.id}>
            <div className={styles.file}><span className={styles.name}>{file.name}</span><span className={styles.meta}>{formatSize(file.size)} · {new Date(file.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span></div>
            <a className={styles.download} href={`/api/class-files/${encodeURIComponent(file.id)}/download`} aria-label={`Download ${file.name}`}>Download <span aria-hidden="true">↓</span></a>
          </li>
        ))}</ul>
      )}
      {!loading && !loadError && nextCursor && <div className={styles.pagination} aria-busy={loadingMore}>
        <button type="button" className={styles.secondary} disabled={loadingMore || pending} onClick={() => void loadMore()}>{loadingMore ? "Loading more…" : "Load more"}</button>
        {loadingMore && <p role="status">Loading more class files…</p>}
        {moreError && <p className={styles.error} role="alert">{moreError}</p>}
      </div>}
    </section>
  );
}

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.ceil(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}
