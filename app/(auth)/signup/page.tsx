"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { authClient } from "@/app/lib/auth-client";

export default function SignupPage() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      router.replace("/owner");
    }
  }, [session, router]);

  const canSubmit = useMemo(() => {
    return (
      name.trim().length > 1 &&
      email.trim().length > 3 &&
      password.length >= 8 &&
      password === confirmPassword
    );
  }, [confirmPassword, email, name, password]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await authClient.signUp.email({
        name,
        email,
        password,
      });
      if (result.error) {
        setError(result.error.message ?? "Unable to create account. Please try again.");
        return;
      }
      router.push("/owner");
      router.refresh();
    } catch (err) {
      console.error("sign-up failed", err);
      setError("A network issue prevented sign up. Please retry.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 rounded-3xl border border-white/10 bg-[rgba(10,18,34,0.88)] p-10 shadow-[0_44px_120px_rgba(124,58,237,0.22)] backdrop-blur-2xl">
      <div className="space-y-3 text-white">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-white/60">
          Begin your residency
        </span>
        <h1 className="text-3xl font-semibold leading-tight">Create your Flow Studio account</h1>
        <p className="max-w-xl text-sm text-white/65">
          Unlock the owner lounge, activate response rituals, and take command of every RGBA nuance in your forms.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="grid gap-6 text-white">
        <label className="grid gap-2 text-sm">
          <span className="text-xs uppercase tracking-[0.35em] text-white/50">Full name</span>
          <input
            type="text"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-2xl border border-white/15 bg-[rgba(14,24,42,0.85)] px-4 py-3 text-sm text-white/80 shadow-inner shadow-[rgba(124,58,237,0.22)] outline-none transition focus:border-[rgba(124,58,237,0.55)] focus:text-white focus:shadow-[0_0_0_4px_rgba(124,58,237,0.14)]"
            placeholder="Avery Laurent"
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="text-xs uppercase tracking-[0.35em] text-white/50">Email address</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-2xl border border-white/15 bg-[rgba(14,24,42,0.85)] px-4 py-3 text-sm text-white/80 shadow-inner shadow-[rgba(14,165,233,0.25)] outline-none transition focus:border-[rgba(56,189,248,0.6)] focus:text-white focus:shadow-[0_0_0_4px_rgba(56,189,248,0.18)]"
            placeholder="studio@flowstudio.co"
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="text-xs uppercase tracking-[0.35em] text-white/50">Password</span>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-white/15 bg-[rgba(14,24,42,0.85)] px-4 py-3 pr-12 text-sm text-white/80 shadow-inner shadow-[rgba(236,72,153,0.2)] outline-none transition focus:border-[rgba(236,72,153,0.55)] focus:text-white focus:shadow-[0_0_0_4px_rgba(236,72,153,0.16)]"
              placeholder="At least 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors"
            >
              {showPassword ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </label>
        <label className="grid gap-2 text-sm">
          <span className="text-xs uppercase tracking-[0.35em] text-white/50">Confirm password</span>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-2xl border border-white/15 bg-[rgba(14,24,42,0.85)] px-4 py-3 pr-12 text-sm text-white/80 shadow-inner shadow-[rgba(45,212,191,0.22)] outline-none transition focus:border-[rgba(34,197,94,0.55)] focus:text-white focus:shadow-[0_0_0_4px_rgba(34,197,94,0.16)]"
              placeholder="Repeat your password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors"
            >
              {showConfirmPassword ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </label>
        <p className="text-xs text-white/45">
          By creating an account you agree to the luminous experience handbook and adaptive interaction policies.
        </p>
        {error ? (
          <div className="rounded-2xl border border-[rgba(248,113,113,0.35)] bg-[rgba(127,29,29,0.35)] px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}
        <button
          type="submit"
          disabled={!canSubmit || isLoading}
          className="group inline-flex items-center justify-center gap-3 rounded-full bg-linear-to-r from-fuchsia-500/80 via-purple-500/80 to-indigo-500/80 px-6 py-3 text-sm font-semibold uppercase tracking-[0.35em] text-white shadow-[0_32px_98px_rgba(168,85,247,0.32)] transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-60 hover:shadow-[0_42px_118px_rgba(168,85,247,0.45)]"
        >
          {isLoading ? "Opening your space..." : "Create account"}
          <span className="translate-y-px transition-transform duration-300 group-hover:translate-x-1">
            →
          </span>
        </button>
      </form>
      <div className="flex flex-col gap-2 rounded-3xl border border-white/10 bg-[rgba(12,22,40,0.82)] p-6 text-sm text-white/60">
        <p className="uppercase tracking-[0.35em] text-white/40">Already orchestrating?</p>
        <div className="flex flex-wrap items-center gap-3">
          <span>Sign in to access live response rituals and advanced theming controls.</span>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/80 transition hover:border-white/30 hover:text-white"
          >
            Return to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
