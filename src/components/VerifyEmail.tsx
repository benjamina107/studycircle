"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function VerifyEmail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("We sent a verification link to your Cal Poly email.");

  useEffect(() => {
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");
    if (!tokenHash || type !== "email") return;
    createClient().auth.verifyOtp({ token_hash: tokenHash, type: "email" }).then(({ error }) => {
      if (error) {
        setMessage(error.message);
        return;
      }
      router.replace("/spaces");
      router.refresh();
    });
  }, [router, searchParams]);

  return <p className="mt-2 text-sm text-zinc-500">{message}</p>;
}
