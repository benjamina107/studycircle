// Chats tab — joined meetups surface here with pinned location + time so
// nobody has to scroll for them (spec §6.4), plus your subspace channels.
// TODO(db): list the user's channels and joined meetups.
export default function ChatsPage() {
  return (
    <main>
      <h1 className="mb-4 text-xl font-bold">Chats</h1>
      <p className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
        Your channels and joined meetups will show up here.
      </p>
    </main>
  );
}
