import "server-only";

import { db } from "@/lib/db";

/** Product's provisional cap until it is confirmed by the team. */
export const DAILY_MEETUP_LIMIT = 5;

export class MeetupError extends Error {}

export type CreateMeetupInput = {
  subspaceId: string;
  title: string;
  blurb?: string | null;
  locationName: string;
  lat?: number | null;
  lng?: number | null;
  startsAt: Date | string;
  timeZone: string;
};

type NormalizedMeetupInput = Omit<CreateMeetupInput, "startsAt" | "blurb"> & {
  startsAt: Date;
  blurb: string | null;
};

function invalid(message: string): never {
  throw new MeetupError(message);
}

function normalizeCreateInput(input: CreateMeetupInput): NormalizedMeetupInput {
  const title = input.title.trim();
  const locationName = input.locationName.trim();
  const blurb = input.blurb?.trim() || null;
  const startsAt = new Date(input.startsAt);
  const hasLat = input.lat !== null && input.lat !== undefined;
  const hasLng = input.lng !== null && input.lng !== undefined;

  if (!title || title.length > 100) invalid("Title must be between 1 and 100 characters.");
  if (!locationName || locationName.length > 140) invalid("Location must be between 1 and 140 characters.");
  if (blurb && blurb.length > 500) invalid("Blurb must be 500 characters or fewer.");
  if (Number.isNaN(startsAt.valueOf()) || startsAt <= new Date()) invalid("Meetups must be scheduled in the future.");
  if (!input.timeZone || input.timeZone.length > 100) invalid("A valid time zone is required.");
  try {
    Intl.DateTimeFormat(undefined, { timeZone: input.timeZone });
  } catch {
    invalid("A valid IANA time zone is required.");
  }
  if (hasLat !== hasLng) invalid("A map pin needs both latitude and longitude.");
  if (hasLat && (!Number.isFinite(input.lat) || !Number.isFinite(input.lng) || Math.abs(input.lat!) > 90 || Math.abs(input.lng!) > 180)) {
    invalid("Map pin coordinates are invalid.");
  }

  return { ...input, title, locationName, blurb, startsAt };
}

/**
 * A member is enrolled in a section for this subspace's course *and* professor.
 * This deliberately does not trust a subspace ID sent by a browser.
 */
async function assertMember(userId: string, subspaceId: string) {
  const subspace = await db.subspace.findUnique({
    where: { id: subspaceId },
    select: { professorId: true, space: { select: { courseId: true } } },
  });
  if (!subspace) invalid("Meetup class was not found.");

  const enrollment = await db.enrollment.findFirst({
    where: {
      userId,
      section: {
        courseId: subspace.space.courseId,
        professorId: subspace.professorId,
      },
    },
    select: { userId: true },
  });
  if (!enrollment) invalid("You are not a member of this class.");
}

function utcDayRange(date: Date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

/** Creates the post and creator attendance together, with the daily cap checked in the same transaction. */
export async function createMeetup(userId: string, rawInput: CreateMeetupInput) {
  const input = normalizeCreateInput(rawInput);
  await assertMember(userId, input.subspaceId);
  const { start, end } = utcDayRange(new Date());

  return db.$transaction(
    async (tx) => {
      // Re-check authorization inside the transaction because actions are untrusted entry points.
      const member = await tx.enrollment.findFirst({
        where: {
          userId,
          section: {
            course: { spaces: { some: { id: input.subspaceId } } },
            professor: { subspaces: { some: { id: input.subspaceId } } },
          },
        },
        select: { userId: true },
      });
      if (!member) invalid("You are not a member of this class.");

      const postsToday = await tx.meetup.count({
        where: { creatorId: userId, createdAt: { gte: start, lt: end } },
      });
      if (postsToday >= DAILY_MEETUP_LIMIT) {
        invalid(`You can create at most ${DAILY_MEETUP_LIMIT} meetups per day.`);
      }

      return tx.meetup.create({
        data: {
          ...input,
          creatorId: userId,
          attendees: { create: { userId } },
        },
      });
    },
    { isolationLevel: "Serializable" },
  );
}

export async function joinMeetup(userId: string, meetupId: string) {
  const meetup = await db.meetup.findUnique({
    where: { id: meetupId },
    select: { id: true, subspaceId: true, startsAt: true },
  });
  if (!meetup) invalid("Meetup was not found.");
  if (meetup.startsAt <= new Date()) invalid("You cannot join a past meetup.");
  await assertMember(userId, meetup.subspaceId);

  return db.meetupAttendee.upsert({
    where: { meetupId_userId: { meetupId, userId } },
    create: { meetupId, userId },
    update: {},
  });
}

export async function leaveMeetup(userId: string, meetupId: string) {
  await db.meetupAttendee.deleteMany({ where: { meetupId, userId } });
}

/** Only the meetup creator may remove another attendee. */
export async function removeAttendee(creatorId: string, meetupId: string, attendeeId: string) {
  if (creatorId === attendeeId) invalid("Use leave to remove yourself from a meetup.");
  const removed = await db.meetupAttendee.deleteMany({
    where: { meetupId, userId: attendeeId, meetup: { creatorId } },
  });
  if (!removed.count) invalid("Only the meetup creator can remove attendees.");
}

/** Data shape used by both the class meetup feed and the Chats tab. */
export async function listMeetupsForMember(userId: string, subspaceId: string) {
  await assertMember(userId, subspaceId);
  return db.meetup.findMany({
    where: { subspaceId, startsAt: { gt: new Date() } },
    orderBy: { startsAt: "asc" },
    include: {
      creator: { select: { id: true, name: true, avatarUrl: true } },
      attendees: {
        orderBy: { joinedAt: "asc" },
        select: { userId: true, user: { select: { name: true, avatarUrl: true } } },
      },
    },
  });
}

export async function listJoinedMeetups(userId: string) {
  return db.meetup.findMany({
    where: { attendees: { some: { userId } }, startsAt: { gt: new Date() } },
    orderBy: { startsAt: "asc" },
    include: { subspace: { include: { space: { include: { course: true } }, professor: true } } },
  });
}
