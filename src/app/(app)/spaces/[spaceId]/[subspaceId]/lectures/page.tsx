// Lectures tab — one folder per class session, keyed to meeting days
// (spec §6.3, §6.6). Anyone can upload notes; AI summarizes each lecture.
// TODO(db): auto-generate folders from the section schedule; uploads; summaries.
export default function LecturesPage() {
  const placeholderDates = ["Mon Sep 1", "Wed Sep 3", "Fri Sep 5"];

  return (
    <main className="flex flex-col gap-2">
      {placeholderDates.map((date) => (
        <div
          key={date}
          className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <span>📁 {date}</span>
          <span className="text-xs text-zinc-500">0 notes</span>
        </div>
      ))}
    </main>
  );
}
