import Link from "next/link";
import SignupForm from "@/components/SignupForm";

export default function SignupPage() {
  return (
    <div>
      <SignupForm />
      <p className="text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-emerald-600">
          Log in
        </Link>
      </p>
    </div>
  );
}
