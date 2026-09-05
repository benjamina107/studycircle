import { Suspense } from "react";
import VerifyEmail from "@/components/VerifyEmail";

export default function VerifyPage() {
  return (
    <div className="text-center">
      <p className="text-lg">Check your inbox 📬</p>
      <Suspense fallback={<p className="mt-2 text-sm text-zinc-500">Verifying your email…</p>}>
        <VerifyEmail />
      </Suspense>
    </div>
  );
}
