export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-zinc-50 px-6 dark:bg-zinc-950">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-2xl font-bold">StudyCircle</h1>
        {children}
      </div>
    </div>
  );
}
