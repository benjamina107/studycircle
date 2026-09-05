// Placeholder data so the scaffold renders meaningfully before the catalog
// prefetch + real queries exist. Delete once pages read from db.ts.

export const mockSpaces = [
  {
    id: "csc202",
    code: "CSC 202",
    title: "Data Structures",
    subspaces: [
      { id: "prof-khosmood", professorName: "Prof. Khosmood" },
      { id: "prof-workman", professorName: "Prof. Workman" },
    ],
  },
  {
    id: "math244",
    code: "MATH 244",
    title: "Linear Analysis I",
    subspaces: [{ id: "prof-borzellino", professorName: "Prof. Borzellino" }],
  },
];

export const mockChannels = ["general", "homework", "meetups"];

export const mockMeetups = [
  {
    id: "m1",
    title: "Kennedy Library study sesh",
    blurb: "2nd floor, big table by the windows",
    locationName: "Kennedy Library",
    startsAt: "Today 3:00 PM",
    creatorName: "Jordan",
    attendeeCount: 4,
  },
  {
    id: "m2",
    title: "Pre-lab review",
    blurb: null,
    locationName: "Baker Center 180",
    startsAt: "Tomorrow 10:00 AM",
    creatorName: "Sam",
    attendeeCount: 2,
  },
];

export const mockExam = { title: "Exam 1", daysAway: 6 };
