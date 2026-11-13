import { Suspense } from "react";
import Link from "next/link";
import { GlassCard } from "@/components/glass/GlassCard";
import { LoginForm } from "@/components/forms/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10">
      <GlassCard className="w-full max-w-md">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">Admin</p>
        <h1 className="mt-1 mb-6 text-3xl font-extrabold">Log in</h1>
        <Suspense>
          <LoginForm />
        </Suspense>
      </GlassCard>

      <Link
        href="/"
        className="text-sm font-medium text-muted underline-offset-4 hover:text-foreground hover:underline"
      >
        Join a quiz
      </Link>
    </div>
  );
}
