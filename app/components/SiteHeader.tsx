"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { authClient } from "@/app/lib/auth-client";
import { useTheme } from "./theme/ThemeProvider";

const links = [
  { href: "/", label: "Home" },
  { href: "/builder", label: "Builder" },
  { href: "/owner", label: "Responses" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [signingOut, setSigningOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [creatingForm, setCreatingForm] = useState(false);
  const { toggleTheme, mode } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const navigation = useMemo(
    () =>
      links.map((link) => ({
        ...link,
        active: pathname === link.href,
      })),
    [pathname]
  );

  const displayName = session?.user?.name || session?.user?.email?.split("@")[0];

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Use CSS variables for overlays so server and client markup remain identical

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      const result = await authClient.signOut();
      if (!result.error) {
        router.push("/");
        router.refresh();
      }
    } catch (error) {
      console.error("Error signing out", error);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <header className="sticky top-5 z-40 flex w-full justify-center px-4 sm:px-6">
      <div
        className="glass-blur relative flex w-full max-w-6xl flex-col overflow-hidden rounded-3xl border transition-all duration-500"
        style={{
          borderColor: "var(--border-subtle)",
          boxShadow: "var(--shadow-lg)",
          backgroundColor: "var(--surface-header)",
          backgroundImage: `var(--surface-overlay), radial-gradient(circle at top right, var(--accent-primary) 0%, transparent 55%)`,
          backdropFilter: "blur(26px)",
        }}
      >
        <div className="flex items-center justify-between gap-4 px-5 py-4 md:px-6">
          <Link href="/" className="group inline-flex items-center gap-3">
            <span
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-lg font-semibold transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:rotate-3"
              style={{
                background: "linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 90%)",
                color: "var(--text-inverse)",
                boxShadow: "var(--shadow-lg)",
              }}
            >
              FB
            </span>
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-semibold uppercase tracking-[0.28em] theme-text-muted">
                Flow Studio
              </span>
              <span className="text-lg font-semibold theme-text-primary">FormBuilder</span>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-semibold md:flex">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="relative px-3 py-2 transition-colors duration-300"
              style={{ color: item.active ? "var(--text-primary)" : "var(--text-muted)" }}
            >
                <span>{item.label}</span>
                {item.active ? (
                  <span
                    className="absolute inset-x-2 -bottom-1.5 h-0.5 rounded-full"
                    style={{
                    background: `linear-gradient(90deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)`,
                    boxShadow: "0 0 16px var(--accent-primary)",
                    }}
                  />
                ) : null}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <button
              type="button"
              onClick={async () => {
                if (creatingForm) return;
                setCreatingForm(true);
                try {
                  const res = await fetch("/api/forms", {
                    method: "POST",
                    credentials: "same-origin",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title: "Untitled form", description: "" }),
                  });
                  if (!res.ok) {
                    console.error("Failed to create form", await res.text());
                    return;
                  }
                  const json = await res.json();
                  const id = json?.form?.id;
                  // navigate to owner studio where new form will appear
                  router.push(id ? `/owner` : "/owner");
                  router.refresh();
                } catch (err) {
                  console.error("Create form error", err);
                } finally {
                  setCreatingForm(false);
                }
              }}
              disabled={creatingForm}
              className="rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.32em] transition-colors duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                border: "1px solid var(--border-subtle)",
                color: "var(--text-secondary)",
                background: "var(--surface-panel)",
              }}
            >
              {creatingForm ? "Creating…" : "New form"}
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.32em] transition-colors duration-300"
              style={{
                border: "1px solid var(--border-subtle)",
                color: "var(--text-secondary)",
                background: "var(--surface-panel)",
              }}
            >
              <span suppressHydrationWarning={true}>
                {mounted ? (mode === "dark" ? "LIGHT" : "DARK") : ""} MODE
              </span>
            </button>
            {session ? (
              <div className="flex items-center gap-3">
                {displayName ? (
                <span
                  className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em]"
                  style={{
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-secondary)",
                    background: "var(--surface-panel)",
                  }}
                >
                    {displayName}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="group inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-70"
                  style={{
                    background: `linear-gradient(90deg, var(--accent-secondary) 0%, var(--accent-tertiary) 100%)`,
                    color: "var(--text-inverse)",
                    boxShadow: "var(--shadow-lg)",
                  }}
                >
                  <span className="translate-y-0 transition-transform duration-300 group-hover:-translate-y-0.5">
                    {signingOut ? "Signing out…" : "Sign out"}
                  </span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-300"
                  style={{
                    border: `1px solid var(--border-subtle)`,
                    color: "var(--text-secondary)",
                    background: "var(--surface-panel)",
                  }}
                >
                  {isPending ? "Loading…" : "Login"}
                </Link>
                  <Link
                    href="/signup"
                    className="group inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-transform duration-300"
                    style={{
                      background: `linear-gradient(90deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)`,
                      color: "var(--text-inverse)",
                      boxShadow: "var(--shadow-lg)",
                    }}
                  >
                  <span className="translate-y-0 transition-transform duration-300 group-hover:-translate-y-0.5">
                    Sign up
                  </span>
                </Link>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border transition-colors duration-300 md:hidden"
            style={{
              border: "1px solid var(--border-subtle)",
              color: "var(--text-primary)",
              background: "var(--surface-panel)",
            }}
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            )}
          </button>
        </div>

        {mobileOpen ? (
          <div className="md:hidden border-t px-5 pb-5" style={{ borderColor: "var(--border-subtle)", background: "var(--surface-panel)" }}>
            <nav className="flex flex-col gap-1 py-4 text-sm font-semibold">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between rounded-xl px-3 py-2 transition-colors duration-300"
                  style={{
                    color: item.active ? "var(--text-primary)" : "var(--text-secondary)",
                    background: item.active ? "var(--surface-card)" : "transparent",
                    border: `1px solid ${item.active ? "var(--border-strong)" : "transparent"}`,
                  }}
                >
                  <span>{item.label}</span>
                  {item.active ? (
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: "var(--accent-primary)", boxShadow: "0 0 10px var(--accent-primary)" }}
                    />
                  ) : null}
                </Link>
              ))}
            </nav>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={toggleTheme}
                className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] transition-colors duration-300"
                style={{
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-secondary)",
                  background: "var(--surface-panel)",
                }}
              >
                {mode === "dark" ? "Switch to light" : "Switch to dark"}
              </button>
              {session ? (
                <div className="flex flex-col gap-3">
                  {displayName ? (
                    <span
                        className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em]"
                        style={{
                          border: `1px solid var(--border-subtle)`,
                          color: "var(--text-secondary)",
                          background: "var(--surface-panel)",
                        }}
                      >
                        {displayName}
                      </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-70"
                    style={{
                      background: `linear-gradient(90deg, var(--accent-secondary) 0%, var(--accent-tertiary) 100%)`,
                      color: "var(--text-inverse)",
                      boxShadow: "var(--shadow-lg)",
                    }}
                  >
                    {signingOut ? "Signing out…" : "Sign out"}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <Link
                    href="/login"
                    className="rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-300"
                    style={{
                      border: `1px solid var(--border-subtle)`,
                      color: "var(--text-secondary)",
                      background: "var(--surface-panel)",
                    }}
                  >
                    {isPending ? "Loading…" : "Login"}
                  </Link>
                  <Link
                    href="/signup"
                    className="rounded-full px-4 py-2 text-sm font-semibold transition-transform duration-300"
                    style={{
                      background: `linear-gradient(90deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)`,
                      color: "var(--text-inverse)",
                      boxShadow: "var(--shadow-lg)",
                    }}
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
