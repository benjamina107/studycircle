import Link from "next/link";
import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div>
      <LoginForm />
      <p className="text-center text-sm text-zinc-500">
        New here?{" "}
        <Link href="/signup" className="font-medium text-emerald-600">
          Sign up
        </Link>
      </p>
    </div>
  );
}
