"use client";

import { useActionState, useState } from "react";
import { completeOnboarding, type OnboardingState } from "@/app/onboarding/actions";

type Values = { name: string; major: string; interests: string; avatar_url: string };
const emptyState: OnboardingState = { message: "", ok: false };

export default function OnboardingForm({ initialValues }: { initialValues: Values }) {
  const [values, setValues] = useState(initialValues);
  const [state, action, pending] = useActionState(completeOnboarding, emptyState);
  function update(field: keyof Values, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }
  const field = (name: keyof Values) => state.errors?.[name];
  return <form action={action} className="onboarding-form" aria-busy={pending}>
    <label className="workspace-field" htmlFor="onboarding-name">Name<input id="onboarding-name" name="name" value={values.name} onChange={(event) => update("name", event.target.value)} required maxLength={100} autoComplete="name" className="workspace-input" aria-invalid={!!field("name")} aria-describedby={field("name") ? "onboarding-name-error" : undefined} />{field("name") && <span id="onboarding-name-error" className="field-error" role="alert">{field("name")}</span>}</label>
    <label className="workspace-field" htmlFor="onboarding-major">Major <span className="workspace-hint">Optional</span><input id="onboarding-major" name="major" value={values.major} onChange={(event) => update("major", event.target.value)} maxLength={120} autoComplete="organization-title" className="workspace-input" aria-invalid={!!field("major")} aria-describedby={field("major") ? "onboarding-major-error" : undefined} />{field("major") && <span id="onboarding-major-error" className="field-error" role="alert">{field("major")}</span>}</label>
    <label className="workspace-field" htmlFor="onboarding-interests">Interests <span className="workspace-hint">Optional</span><textarea id="onboarding-interests" name="interests" value={values.interests} onChange={(event) => update("interests", event.target.value)} maxLength={500} rows={3} placeholder="Subjects, hobbies, or activities" className="workspace-input" aria-invalid={!!field("interests")} aria-describedby={field("interests") ? "onboarding-interests-error" : undefined} />{field("interests") && <span id="onboarding-interests-error" className="field-error" role="alert">{field("interests")}</span>}</label>
    <label className="workspace-field" htmlFor="onboarding-avatar">Profile picture link <span className="workspace-hint">Optional</span><input id="onboarding-avatar" name="avatar_url" type="url" value={values.avatar_url} onChange={(event) => update("avatar_url", event.target.value)} maxLength={2048} placeholder="https://…" className="workspace-input" aria-invalid={!!field("avatar_url")} aria-describedby={field("avatar_url") ? "onboarding-avatar-error" : undefined} /><span className="workspace-hint">Use an HTTPS image link, or leave blank.</span>{field("avatar_url") && <span id="onboarding-avatar-error" className="field-error" role="alert">{field("avatar_url")}</span>}</label>
    <button disabled={pending} className="workspace-button">{pending ? "Saving…" : "Save and continue"}</button>
    {state.message && <p role={state.ok ? "status" : "alert"} className="workspace-notice">{state.message}</p>}
  </form>;
}
