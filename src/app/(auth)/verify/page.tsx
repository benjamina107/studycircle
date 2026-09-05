// Landing page for the email-verification link (spec §6.1).
// TODO(auth): look up ?token=, mark User.emailVerified, redirect to class selection.
export default function VerifyPage() {
  return (
    <div className="text-center">
      <p className="text-lg">Check your inbox 📬</p>
      <p className="mt-2 text-sm text-zinc-500">
        We sent a verification link to your Cal Poly email.
      </p>
    </div>
  );
}
