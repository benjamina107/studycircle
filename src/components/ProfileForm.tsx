"use client";

import { useActionState } from "react";
import { saveProfile } from "@/app/(app)/profile/actions";

export type EditableProfile = { name: string | null; major: string | null; interests: string | null; avatar_url: string | null };

export default function ProfileForm({ profile, email }: { profile: EditableProfile; email: string }) {
  const [state, action, pending] = useActionState(saveProfile, { message: "", ok: false });
  const inputClass = "workspace-input";
  return <form action={action} className="workspace-panel profile-form">
    <div className="profile-identity">
    {profile.avatar_url ? <div>{/* External HTTPS image loads in the browser, not through server fetching. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={profile.avatar_url} alt="Your profile picture" width={52} height={52} referrerPolicy="no-referrer" className="profile-avatar" />
    </div> : <span className="profile-avatar" aria-hidden="true">{(profile.name || "?").slice(0,1).toUpperCase()}</span>}
    <div><strong>{profile.name || "Your profile"}</strong><p>{email} · Verified email</p></div></div>
    <label className="workspace-field">Name<input name="name" defaultValue={profile.name || ""} required maxLength={100} autoComplete="name" className={inputClass} /></label>
    <label className="workspace-field">Major <span className="workspace-hint">Optional</span><input name="major" defaultValue={profile.major || ""} maxLength={120} className={inputClass} /></label>
    <label className="workspace-field">Interests<textarea name="interests" defaultValue={profile.interests || ""} maxLength={500} rows={3} placeholder="Subjects, hobbies, or activities" className={inputClass} /></label>
    <label className="workspace-field">Profile picture link<input name="avatar_url" type="url" defaultValue={profile.avatar_url || ""} maxLength={2048} placeholder="https://…" className={inputClass} /><span className="workspace-hint">Paste an HTTPS image link. Leave blank to remove your picture.</span></label>
    <button disabled={pending} className="workspace-button">{pending ? "Saving…" : "Save changes"}</button>
    {state.message && <p role={state.ok ? "status" : "alert"} className="text-sm">{state.message}</p>}
  </form>;
}
