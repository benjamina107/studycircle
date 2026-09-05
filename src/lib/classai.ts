// Class AI — spec §6.6. A bot scoped to a subspace, with that subspace's
// uploaded notes + syllabus as context. All stubs; wire to an LLM provider
// when the notes-upload pipeline exists.

/** Per-lecture summary: "what this lecture covered" (retains term memory). */
export async function summarizeLecture(_lectureFolderId: string): Promise<string> {
  throw new Error("Not implemented: per-lecture summary");
}

/** Answer a question with class context — a lecture's or the whole subspace's. */
export async function askClassAI(_options: {
  subspaceId: string;
  question: string;
  lectureFolderId?: string;
}): Promise<string> {
  throw new Error("Not implemented: Class AI Q&A");
}

/** Parse an uploaded syllabus into ScheduleItems (exam/quiz dates, cumulative flags, topics). */
export async function parseSyllabus(_courseScheduleId: string): Promise<void> {
  throw new Error("Not implemented: syllabus parsing");
}

/** ~1 week before an exam: summary + practice test from the relevant lectures' notes. */
export async function generateExamPrep(_scheduleItemId: string): Promise<{
  summary: string;
  practiceTest: string;
}> {
  throw new Error("Not implemented: exam prep generation");
}
