import { redirect } from "next/navigation";

// TODO(auth): send signed-out users to /login once auth exists.
export default function Home() {
  redirect("/spaces");
}
