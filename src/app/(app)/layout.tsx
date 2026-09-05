import BottomNav from "@/components/BottomNav";

// Mobile-first app shell: content column + fixed bottom tab bar (spec §6.2).
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-lg px-4 pb-20 pt-4">{children}</div>
      <BottomNav />
    </div>
  );
}
