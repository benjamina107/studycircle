import type { MeetupDetails } from "./meetups-validation";

// Plain transport shapes: a future data adapter can supply these without tying
// the presentation to a database client. No persistence adapter exists here.
export type MeetupPerson = { id: string; name: string; initials: string };
export type MeetupRecord = MeetupDetails & {
  id: string;
  creator: MeetupPerson;
  participants: MeetupPerson[];
};
export type MeetupsData = { meetups: MeetupRecord[]; viewer: MeetupPerson };
export const DEMO_MEETUP_USER: MeetupPerson = { id: "demo-you", name: "Alex Sample", initials: "AS" };
const RILEY = { id: "demo-riley", name: "Riley Example", initials: "RE" };
const MORGAN = { id: "demo-morgan", name: "Morgan Placeholder", initials: "MP" };
export const DEMO_PLACES = [
  { name: "Example library table", latitude: "35.3015", longitude: "-120.6588" },
  { name: "Example courtyard bench", latitude: "35.3002", longitude: "-120.6602" },
] as const;

export function makeMeetupsDemo(now: number): MeetupsData {
  return {
    viewer: { ...DEMO_MEETUP_USER },
    meetups: [
      {
        id: "demo-review", title: "Work through the tricky problems", blurb: "Fictional study session. Bring your questions and work at your own pace.",
        location: DEMO_PLACES[0].name, latitude: Number(DEMO_PLACES[0].latitude), longitude: Number(DEMO_PLACES[0].longitude),
        startsAt: new Date(now + 86_400_000).toISOString(), creator: { ...RILEY }, participants: [{ ...RILEY }, { ...MORGAN }],
      },
      {
        id: "demo-owned", title: "A little prep, a little fresh air", blurb: "You host this fictional meetup. Try removing a sample participant below.",
        location: DEMO_PLACES[1].name, latitude: Number(DEMO_PLACES[1].latitude), longitude: Number(DEMO_PLACES[1].longitude),
        startsAt: new Date(now + 172_800_000).toISOString(), creator: { ...DEMO_MEETUP_USER }, participants: [{ ...DEMO_MEETUP_USER }, { ...MORGAN }],
      },
    ],
  };
}

export type MeetupChange = { kind: "join" } | { kind: "leave" } | { kind: "remove"; participantId: string };
export function changeMeetup(meetups: MeetupRecord[], id: string, actor: MeetupPerson, change: MeetupChange, now: number): MeetupRecord[] {
  const meetup = meetups.find(item => item.id === id);
  if (!meetup) throw new Error("This sample meetup is no longer available.");
  if (Date.parse(meetup.startsAt) <= now) throw new Error("This sample meetup has started. Choose an upcoming meetup.");
  let participants = meetup.participants;
  if (change.kind === "join") {
    if (!participants.some(person => person.id === actor.id)) participants = [...participants, actor];
  } else {
    const target = change.kind === "leave" ? actor.id : change.participantId;
    if (change.kind === "remove" && actor.id !== meetup.creator.id) throw new Error("Only the sample host can remove participants.");
    if (target === meetup.creator.id) throw new Error("The sample host stays in their own meetup.");
    if (!participants.some(person => person.id === target)) throw new Error("That sample participant is no longer in this meetup.");
    participants = participants.filter(person => person.id !== target);
  }
  return meetups.map(item => item.id === id ? { ...item, participants } : item);
}

export function addDemoMeetup(meetups: MeetupRecord[], details: MeetupDetails, viewer: MeetupPerson, id: string): MeetupRecord[] {
  if (meetups.some(meetup => meetup.id === id)) throw new Error("This sample meetup already exists. Please try again.");
  return [...meetups, { ...details, id, creator: viewer, participants: [viewer] }]
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
}
