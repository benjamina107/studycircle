import { mockChannels } from "@/lib/mock-data";

// Chat tab — predefined channels only, Discord-style (spec §6.5).
// TODO(chat): channel routes, messages, pinned meetup widget, @ClassAI replies.
export default function ChatPage() {
  return (
    <main>
      <ul className="flex flex-col gap-2">
        {mockChannels.map((channel) => (
          <li
            key={channel}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <span className="text-zinc-400">#</span> {channel}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-center text-sm text-zinc-500">
        Mention <span className="font-medium">@ClassAI</span> in any channel to
        ask about the class.
      </p>
    </main>
  );
}
