"use client";

import { useRef, useState, type FormEvent } from "react";
import { DEMO_PLACES } from "@/lib/meetups-demo";
import { campusDateTime, MEETUP_LIMITS, validateMeetup, type MeetupDetails, type MeetupDraft, type MeetupErrors } from "@/lib/meetups-validation";

export default function MeetupCreateForm({ onCreate, onCancel }: { onCreate: (details: MeetupDetails) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<MeetupDraft>({ title: "", blurb: "", location: "", latitude: "", longitude: "", date: "", time: "" });
  const [errors, setErrors] = useState<MeetupErrors>({});
  const formRef = useRef<HTMLFormElement>(null);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateMeetup(draft, Date.now());
    if (!result.ok) {
      setErrors(result.errors);
      const first = Object.keys(result.errors)[0];
      (formRef.current?.elements.namedItem(first) as HTMLElement | null)?.focus();
      return;
    }
    onCreate(result.value);
  }
  function field(key: keyof MeetupDraft, label: string, type = "text") {
    return <div className="min-w-0">
      <label htmlFor={`meetup-${key}`} className="mb-1.5 block text-sm font-semibold">{label}</label>
      <input id={`meetup-${key}`} name={key} type={type} value={draft[key]} required={key !== "blurb"}
        maxLength={key in MEETUP_LIMITS ? MEETUP_LIMITS[key as keyof typeof MEETUP_LIMITS] : undefined}
        inputMode={key === "latitude" || key === "longitude" ? "text" : undefined}
        aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `meetup-${key}-error` : undefined}
        onChange={event => setDraft({ ...draft, [key]: event.target.value })}
        className="min-h-12 w-full min-w-0 rounded-xl border border-stone-300 bg-white px-3 py-2 text-base outline-offset-2 focus:outline-emerald-700" />
      {errors[key] && <p id={`meetup-${key}-error`} className="mt-1 text-sm text-rose-800">{errors[key]}</p>}
    </div>;
  }
  return <form ref={formRef} onSubmit={submit} noValidate className="rounded-3xl border border-emerald-200 bg-white p-5 sm:p-7" aria-labelledby="meetup-create-title">
    <h2 id="meetup-create-title" className="text-xl font-semibold">Create a sample meetup</h2>
    <p className="mt-1 text-sm text-stone-600">Your sample meetup appears only on this page and disappears when you reload or leave. Nothing is saved and no invitations are sent.</p>
    {Object.keys(errors).length > 0 && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-900">Check the highlighted fields. Your sample meetup has not been added.</p>}
    <div className="mt-5 space-y-5">
      {field("title", `Short title · ${MEETUP_LIMITS.title} characters max`)}
      <div><label htmlFor="meetup-blurb" className="mb-1.5 block text-sm font-semibold">Blurb (optional) · {MEETUP_LIMITS.blurb} characters max</label><textarea id="meetup-blurb" name="blurb" rows={3} value={draft.blurb} maxLength={MEETUP_LIMITS.blurb} onChange={event => setDraft({ ...draft, blurb: event.target.value })} aria-invalid={!!errors.blurb} aria-describedby={errors.blurb ? "meetup-blurb-error" : undefined} className="w-full rounded-xl border border-stone-300 bg-white p-3 text-base outline-offset-2 focus:outline-emerald-700" />{errors.blurb && <p id="meetup-blurb-error" className="text-sm text-rose-800">{errors.blurb}</p>}</div>
      <fieldset className="space-y-3"><legend className="mb-2 text-sm font-semibold">Location & map pin</legend>
        <p className="text-sm text-stone-600">Choose a sample location or enter a name and coordinates below. This preview has no interactive map or place search.</p>
        <div className="flex flex-wrap gap-2">{DEMO_PLACES.map(place => <button key={place.name} type="button" onClick={() => setDraft({ ...draft, location: place.name, latitude: place.latitude, longitude: place.longitude })} className="min-h-11 rounded-xl border border-stone-300 px-3 py-2 text-sm hover:bg-emerald-50">⌖ {place.name}</button>)}</div>
        {field("location", "Location name")}
        <div className="grid gap-3 sm:grid-cols-2">{field("latitude", "Latitude (−90 to 90)")}{field("longitude", "Longitude (−180 to 180)")}</div>
      </fieldset>
      <fieldset><legend className="mb-2 text-sm font-semibold">When · campus time (Pacific)</legend><p className="mb-3 text-sm text-stone-600">Choose a future date and time in Pacific time, even if you are in another timezone. Avoid hours that repeat or are skipped when the clocks change.</p><div className="grid gap-3 sm:grid-cols-2">{field("date", "Date", "date")}{field("time", "Time", "time")}</div>
        <button type="button" onClick={() => setDraft({ ...draft, ...campusDateTime(Date.now() + 86_400_000) })} className="mt-2 min-h-11 text-sm font-semibold text-emerald-900 underline underline-offset-4">Use this time tomorrow</button>
      </fieldset>
      <div className="flex flex-wrap gap-3"><button type="submit" className="min-h-12 rounded-xl bg-emerald-900 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800">Add to this demo</button><button type="button" onClick={onCancel} className="min-h-12 rounded-xl border border-stone-300 px-5 py-3 text-sm font-semibold">Cancel</button></div>
    </div>
  </form>;
}
