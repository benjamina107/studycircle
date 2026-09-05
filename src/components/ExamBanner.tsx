// Exam banner — spec §6.3: "Exam 1 in 6 days", driven by the parsed syllabus.

export default function ExamBanner({
  title,
  daysAway,
}: {
  title: string;
  daysAway: number;
}) {
  return (
    <div className="rounded-lg bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">
      ⚠️ {title} in {daysAway} day{daysAway === 1 ? "" : "s"}
    </div>
  );
}
