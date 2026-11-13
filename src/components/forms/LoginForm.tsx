"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { GlassInput } from "@/components/glass/GlassInput";
import { GlassButton } from "@/components/glass/GlassButton";
import { useAuth } from "@/components/providers/AuthProvider";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Only follow internal redirects (mirrors web-quizmosa's redirectPath guard).
function safeRedirect(raw: string | null) {
  return raw && /^\/(?![/\\])/.test(raw) ? raw : "/dashboard";
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [alert, setAlert] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const validate = () => {
    const next: typeof errors = {};
    if (!email.trim()) next.email = "Email is required";
    else if (!EMAIL_RE.test(email.trim())) next.email = "Enter a valid email";
    if (!password) next.password = "Password is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);
    if (!validate()) return;

    setProcessing(true);
    try {
      await signIn(email, password);
      router.replace(safeRedirect(params.get("redirect")));
    } catch (err) {
      setAlert(err instanceof Error ? err.message : "Something went wrong");
      setPassword("");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {alert && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm font-medium text-danger"
        >
          <AlertCircle className="size-4 shrink-0" />
          {alert}
        </div>
      )}

      <GlassInput
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        error={errors.email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <GlassInput
        label="Password"
        name="password"
        type={showPassword ? "text" : "password"}
        autoComplete="current-password"
        required
        value={password}
        error={errors.password}
        onChange={(e) => setPassword(e.target.value)}
        trailing={
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="grid size-8 place-items-center rounded-lg text-muted hover:text-foreground"
          >
            {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        }
      />

      <GlassButton type="submit" size="lg" block loading={processing}>
        Log in
      </GlassButton>
    </form>
  );
}
