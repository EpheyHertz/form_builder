"use client";

import { useMemo, useState, useEffect } from "react";

import { authClient } from "@/app/lib/auth-client";
import { mergeFlashlights, useTheme } from "./theme/ThemeProvider";
import { useDashboardOverview } from "@/app/hooks/useDashboardOverview";

const numberFormatter = new Intl.NumberFormat("en", { notation: "compact" });

function formatDuration(ms: number | null) {
  if (!ms) return "—";
  const totalSeconds = Math.max(Math.round(ms / 1000), 1);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

function formatTimestamp(input: string) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildGradient(flashlights: ReturnType<typeof mergeFlashlights>) {
  if (flashlights.length === 0) {
    return "var(--surface-overlay)";
  }
  const anchors = ["top left", "bottom right", "center", "top right"];
  return flashlights
    .map((flash, index) => `radial-gradient(circle at ${anchors[index % anchors.length]}, ${flash.color}, transparent 65%)`)
    .join(", ");
}

type Answer = {
  id: string;
  fieldId: string;
  fieldLabel: string;
  type: string;
  value: string | number | boolean | string[] | null;
};

type FullResponse = {
  id: string;
  formId: string;
  submittedAt: string;
  completionMs: number | null;
  meta?: Record<string, unknown>;
  answers: Answer[];
};

export function OwnerDashboard() {
  const { data: session } = authClient.useSession();
  const { palette } = useTheme();
  const overviewState = useDashboardOverview();

  const ownerName = session?.user?.name || session?.user?.email?.split("@")[0] || "Owner";

  const flashlights = useMemo(
    () => mergeFlashlights(palette.flashlights, overviewState.data?.flashlights),
    [overviewState.data?.flashlights, palette.flashlights]
  );

  const heroGradient = useMemo(() => buildGradient(flashlights), [flashlights]);

  const totals = overviewState.data?.totals;
  const metrics = [
    {
      label: "Forms live",
      value: totals ? numberFormatter.format(totals.forms) : "—",
      annotation: totals && totals.forms === 0 ? "Start your first form" : "Actively collecting",
    },
    {
      label: "Responses captured",
      value: totals ? numberFormatter.format(totals.responses) : "—",
      annotation: totals && totals.responses > 0 ? "Flow in motion" : "Awaiting submissions",
    },
    {
      label: "Avg completion",
      value: totals ? formatDuration(totals.avgCompletionMs) : "—",
      annotation: totals?.avgCompletionMs ? "Participant focus" : "Need more data",
    },
    {
      label: "Velocity",
      value: totals ? `${totals.responseVelocity.toFixed(1)}/day` : "—",
      annotation: totals && totals.responseVelocity > 0 ? "Daily rhythm" : "Building cadence",
    },
  ];

  const timeseries = overviewState.data?.timeseries ?? [];
  const maxResponses = timeseries.reduce((max, item) => (item.responses > max ? item.responses : max), 0) || 1;

  const [shareMap, setShareMap] = useState<Record<string, { loading?: boolean; error?: string; data?: { token: string; url: string } } | undefined>>({});
  const [selectedShareForm, setSelectedShareForm] = useState<{ id: string; title: string } | null>(null);
  const [sharePassword, setSharePassword] = useState<string>("");
  const [shareExpiryDays, setShareExpiryDays] = useState<number | null>(7);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [sharePasswordError, setSharePasswordError] = useState<string | null>(null);
  const [selectedResponse, setSelectedResponse] = useState<FullResponse | null>(null);
  const [responseModalOpen, setResponseModalOpen] = useState(false);


  const createShare = async (formId: string, expiryDays?: number | null, password?: string | null) => {
    setShareMap((s) => ({ ...s, [formId]: { ...(s[formId] ?? {}), loading: true, error: undefined } }));
    try {
      const body: { expiresAt?: string; password?: string } = {};
      if (typeof expiryDays === "number" && expiryDays > 0) {
        const expires = new Date();
        expires.setDate(expires.getDate() + expiryDays);
        body.expiresAt = expires.toISOString();
      }
      if (password) body.password = password;
      // Always allow generating a new share (backend deletes previous automatically)
      const res = await fetch(`/api/forms/${formId}/share`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errorMsg = json?.error || res.statusText || "Unknown error";
        setShareMap((s) => ({ ...s, [formId]: { loading: false, error: errorMsg } }));
        return;
      }
      const share = json?.share;
      if (share) {
        setShareMap((s) => ({ ...s, [formId]: { loading: false, data: { token: share.token, url: share.url } } }));
        try {
          // persist chosen expiry for this form
          if (typeof expiryDays === "number") {
            localStorage.setItem(`shareExpiry:${formId}`, String(expiryDays));
          }
          // persist share link under its form
          localStorage.setItem(`shareLink:${formId}`, JSON.stringify(share));
        } catch (e) {
          void e;
        }
        setSelectedShareForm(null);
        setSharePassword("");
        setShareExpiryDays(7);
      } else {
        setShareMap((s) => ({ ...s, [formId]: { loading: false, error: "Invalid response" } }));
      }
    } catch (err: unknown) {
      const message = (err instanceof Error ? err.message : String(err));
      setShareMap((s) => ({ ...s, [formId]: { loading: false, error: message } }));
    }
  };

  // load persisted expiry for selected form
  useEffect(() => {
    if (!selectedShareForm) return;
    try {
      const raw = localStorage.getItem(`shareExpiry:${selectedShareForm.id}`);
      if (raw !== null) {
        const n = Number(raw);
        setShareExpiryDays(Number.isFinite(n) ? (n === 0 ? null : n) : 7);
      } else {
        setShareExpiryDays(7);
      }
    } catch (e) {
      void e;
      setShareExpiryDays(7);
    }
  }, [selectedShareForm]);

  useEffect(() => {
    if (!copyMessage) return;
    const t = window.setTimeout(() => setCopyMessage(null), 2000);
    return () => window.clearTimeout(t);
  }, [copyMessage]);

  const revokeShare = async (formId: string, token: string) => {
    setShareMap((s) => ({ ...s, [formId]: { ...(s[formId] ?? {}), loading: true } }));
    try {
  const res = await fetch(`/api/forms/${formId}/share/${token}`, { method: "DELETE", credentials: "same-origin" });
      if (!res.ok) throw new Error(await res.text());
      setShareMap((s) => ({ ...s, [formId]: undefined }));
    } catch (err: unknown) {
      const message = (err instanceof Error ? err.message : String(err));
      setShareMap((s) => ({ ...s, [formId]: { loading: false, error: message } }));
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <section
        className="relative overflow-hidden rounded-4xl border p-8 transition-colors duration-300"
        style={{
          background: palette.surfaces.panel,
          borderColor: palette.border.subtle,
          boxShadow: palette.shadows.xl,
        }}
      >
        <div className="absolute inset-0" style={{ background: heroGradient, opacity: 0.92 }} />
        <div className="relative z-10 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div className="space-y-6">
            <span
              className="inline-flex items-center gap-2 rounded-full px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.32em]"
              style={{
                border: `1px solid ${palette.border.subtle}`,
                color: palette.text.secondary,
                background: "rgba(255,255,255,0.04)",
              }}
            >
              Owner lounge
            </span>
            <h1 className="text-[2.35rem] font-semibold leading-tight" style={{ color: palette.text.primary }}>
              Welcome back, {ownerName}. Your canvas is synced.
            </h1>
            <p className="max-w-xl text-sm" style={{ color: palette.text.secondary }}>
              Track live responses, adjust gradients powered by real data, and guide collaborators with clarity across dark and light modes.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="relative overflow-hidden rounded-3xl border p-5"
                  style={{
                    borderColor: palette.border.subtle,
                    background: palette.surfaces.card,
                    boxShadow: palette.shadows.lg,
                  }}
                >
                  <div className="relative z-10 space-y-2">
                    <p className="text-xs uppercase tracking-[0.3em] theme-text-muted">{metric.label}</p>
                    <p className="text-2xl font-semibold theme-text-primary">{metric.value}</p>
                    <p className="text-xs theme-text-muted">{metric.annotation}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-3xl border p-6" style={{ borderColor: palette.border.subtle, background: palette.surfaces.card }}>
              <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.3em] theme-text-muted">
                <span>Response cadence</span>
                <span>{timeseries.length} day trend</span>
              </div>
              <div className="grid grid-cols-10 gap-3">
                {timeseries.map((point) => (
                  <div key={point.date} className="flex flex-col items-center gap-2">
                    <div
                      className="w-full rounded-full"
                      style={{
                        background: palette.accent.primary,
                        height: `${Math.max((point.responses / maxResponses) * 96, 4)}px`,
                      }}
                    />
                    <span className="text-[0.65rem] uppercase tracking-[0.28em] theme-text-muted">
                      {point.date.slice(5)}
                    </span>
                  </div>
                ))}
                {timeseries.length === 0 ? (
                  <p className="col-span-full text-sm theme-text-muted">No responses yet. Share a form to begin the glow.</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-3xl border p-6" style={{ borderColor: palette.border.subtle, background: palette.surfaces.card }}>
              <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.3em] theme-text-muted">
                <span>Flashlight pulses</span>
                <span>Live RGBA hues</span>
              </div>
              <div className="space-y-3">
                {flashlights.map((flash) => (
                  <div key={flash.id} className="flex items-center gap-4">
                    <span
                      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-xs font-semibold uppercase tracking-[0.28em] theme-text-inverse"
                      style={{
                        background: flash.color,
                        boxShadow: `0 0 24px ${flash.halo}`,
                      }}
                    >
                      {flash.label.split(" ")[0]}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-sm theme-text-primary">{flash.label}</span>
                      <span className="text-xs theme-text-muted">{flash.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border p-6" style={{ borderColor: palette.border.subtle, background: palette.surfaces.card }}>
              <div className="mb-4 text-xs uppercase tracking-[0.3em] theme-text-muted">Top forms</div>
              <div className="space-y-3">
                {(overviewState.data?.topForms ?? []).map((form) => {
                  const shareEntry = shareMap[form.id];
                  return (
                    <div key={form.id} className="flex items-center justify-between rounded-2xl border px-4 py-3" style={{ borderColor: palette.border.subtle }}>
                      <div>
                        <p className="font-semibold theme-text-primary">{form.title}</p>
                        <p className="text-xs theme-text-muted">{form.fields} fields • {form.responses} responses</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] theme-text-inverse"
                          style={{ background: palette.accent.secondary }}
                        >
                          {numberFormatter.format(form.responses)}
                        </span>
                        <div className="flex items-center gap-2">
                          {shareEntry?.data ? (
                            <div className="flex items-center gap-2">
                              <a href={shareEntry.data.url} target="_blank" rel="noreferrer" className="text-xs underline">
                                Share link
                              </a>
                              <button
                                type="button"
                                className="text-xs px-2 py-1 rounded-md border"
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(shareEntry.data!.url);
                                    setCopyMessage("Copied!");
                                  } catch (err) {
                                    void err;
                                    setCopyMessage("Copy failed");
                                  }
                                }}
                              >
                                Copy
                              </button>
                              <button
                                type="button"
                                className="text-xs px-2 py-1 rounded-md border text-rose-600"
                                onClick={() => {
                                  if (confirm("Revoke this share link?")) revokeShare(form.id, shareEntry.data!.token);
                                }}
                              >
                                Revoke
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                className="text-xs px-3 py-1 rounded-md border"
                                onClick={() => {
                                  setSelectedShareForm({ id: form.id, title: form.title });
                                  // prefill expiry selection
                                  setShareExpiryDays(7);
                                }}
                                disabled={shareEntry?.loading}
                              >
                                Share
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {(overviewState.data?.topForms?.length ?? 0) === 0 ? (
                  <p className="text-sm theme-text-muted">Create a form to start building highlights.</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div
          className="rounded-3xl border p-6"
          style={{
            borderColor: palette.border.subtle,
            background: palette.surfaces.panel,
            boxShadow: palette.shadows.lg,
          }}
        >
          <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.3em] theme-text-muted">
            <span>Recent responses</span>
            <button
              type="button"
              onClick={overviewState.refresh}
              className="rounded-full px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em]"
              style={{
                border: `1px solid ${palette.border.subtle}`,
                background: "transparent",
                color: palette.text.secondary,
              }}
            >
              Refresh
            </button>
          </div>
          <div className="space-y-3">
            {(overviewState.data?.recentResponses ?? []).map((response) => (
              <div key={response.id} className="rounded-2xl border p-4" style={{ borderColor: palette.border.subtle, background: palette.surfaces.card }}>
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.28em] theme-text-muted">
                  <span>{response.formTitle}</span>
                  <span>{formatTimestamp(response.submittedAt)}</span>
                </div>
                <p className="mt-3 text-sm theme-text-primary">
                  {response.highlight ?? "Submission recorded. Explore detailed answers in the builder."}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs theme-text-muted">Completion: {formatDuration(response.completionMs)}</p>
                  <button
                    type="button"
                    className="rounded-full px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em]"
                    style={{
                      border: `1px solid ${palette.border.subtle}`,
                      background: "transparent",
                      color: palette.text.secondary,
                    }}
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/forms/${response.formId}/responses/${response.id}`, { credentials: "same-origin" });
                        if (!res.ok) throw new Error(await res.text());
                        const data = await res.json();
                        setSelectedResponse(data.response);
                        setResponseModalOpen(true);
                      } catch (err) {
                        console.error("Failed to load response:", err);
                      }
                    }}
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
            {(overviewState.data?.recentResponses?.length ?? 0) === 0 ? (
              <p className="text-sm theme-text-muted">No responses captured yet. Share a link to light up this timeline.</p>
            ) : null}
          </div>
        </div>

        <div
          className="rounded-3xl border p-6"
          style={{
            borderColor: palette.border.subtle,
            background: palette.surfaces.panel,
            boxShadow: palette.shadows.lg,
          }}
        >
          <div className="mb-4 text-xs uppercase tracking-[0.3em] theme-text-muted">Status</div>
          <div className="space-y-4">
            <div className="rounded-2xl border p-4" style={{ borderColor: palette.border.subtle, background: palette.surfaces.card }}>
              <p className="text-sm font-semibold theme-text-primary">Overview</p>
              <p className="mt-2 text-sm theme-text-secondary">
                {totals && totals.responses > 0
                  ? "Your forms are actively collecting insights. Use the builder to fine-tune fields and share tokens to invite collaborators."
                  : "Set up your first form in the builder and generate a share link to start collecting responses."}
              </p>
            </div>
            {overviewState.loading ? (
              <p className="text-sm theme-text-muted">Loading live telemetry…</p>
            ) : overviewState.error ? (
              <p className="text-sm text-rose-500">{overviewState.error}</p>
            ) : (
              <div className="rounded-2xl border p-4" style={{ borderColor: palette.border.subtle, background: palette.surfaces.card }}>
                <p className="text-sm font-semibold theme-text-primary">Insights</p>
                <ul className="mt-3 space-y-2 text-sm theme-text-secondary">
                  <li>
                    • Peak day: {timeseries.length > 0 ? timeseries.reduce((best, point) => (point.responses > best.responses ? point : best)).date : "—"}
                  </li>
                  <li>• New flashlights adapt after each response.</li>
                  <li>
                    • Theme toggle keeps your experience cohesive across studio sessions.
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>



      {selectedShareForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={() => setSelectedShareForm(null)} />
          <div
            className="relative z-10 w-full max-w-md rounded-2xl p-6 shadow-2xl border"
            style={{
              background: palette.surfaces.panel,
              borderColor: palette.border.subtle,
              color: palette.text.primary,
              boxShadow: palette.shadows.xl,
              transition: "background 0.3s, color 0.3s",
            }}
          >
            <h3 className="text-lg font-semibold mb-3" style={{ color: palette.text.primary }}>
              Share &ldquo;{selectedShareForm.title}&rdquo;
            </h3>
            <div className="space-y-3">
              <label className="block text-xs font-semibold" style={{ color: palette.text.secondary }}>Expiry</label>
              <select
                value={shareExpiryDays ?? 0}
                onChange={(e) => setShareExpiryDays(Number(e.target.value) || null)}
                className="w-full rounded-md border px-2 py-2"
                style={{
                  background: palette.surfaces.card,
                  borderColor: palette.border.subtle,
                  color: palette.text.primary,
                }}
              >
                <option value={0}>No expiry</option>
                <option value={1}>1 day</option>
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
              </select>

              <label className="block text-xs font-semibold" style={{ color: palette.text.secondary }}>Password (optional)</label>
              <input
                type="password"
                value={sharePassword}
                onChange={(e) => setSharePassword(e.target.value)}
                className="w-full rounded-md border px-3 py-2"
                placeholder="Enter a password to protect the share link"
                style={{
                  background: palette.surfaces.card,
                  borderColor: palette.border.subtle,
                  color: palette.text.primary,
                }}
              />
              {sharePasswordError ? <p className="text-xs" style={{ color: "#ef4444" }}>{sharePasswordError}</p> : null}
              {shareMap[selectedShareForm.id]?.error ? (
                <p className="text-xs mt-1" style={{ color: "#ef4444" }}>
                  {shareMap[selectedShareForm.id]?.error}
                </p>
              ) : null}

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  className="px-3 py-2 rounded-md border"
                  style={{
                    background: palette.surfaces.card,
                    borderColor: palette.border.subtle,
                    color: palette.text.secondary,
                  }}
                  onClick={() => setSelectedShareForm(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-3 py-2 rounded-md"
                  style={{
                    background: palette.accent.primary,
                    color: palette.text.inverse,
                    opacity: Boolean(shareMap[selectedShareForm.id]?.loading) ? 0.6 : 1,
                  }}
                  onClick={() => {
                    // client-side validation
                    if (sharePassword && sharePassword.length > 0 && sharePassword.length < 6) {
                      setSharePasswordError("Password must be at least 6 characters");
                      return;
                    }
                    setSharePasswordError(null);
                    createShare(selectedShareForm.id, shareExpiryDays, sharePassword || null);
                  }}
                  disabled={Boolean(shareMap[selectedShareForm.id]?.loading)}
                >
                  {shareMap[selectedShareForm.id]?.loading ? "Creating…" : "Create share"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {responseModalOpen && selectedResponse ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={() => setResponseModalOpen(false)} />
          <div
            className="relative z-10 w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl p-6 shadow-2xl border"
            style={{
              background: palette.surfaces.panel,
              borderColor: palette.border.subtle,
              color: palette.text.primary,
              boxShadow: palette.shadows.xl,
              transition: "background 0.3s, color 0.3s",
            }}
          >
            <div className="mb-6">
              <h2 className="text-xl font-semibold" style={{ color: palette.text.primary }}>Response Details</h2>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold" style={{ color: palette.text.primary }}>Submitted at:</h3>
                <p style={{ color: palette.text.secondary }}>{new Date(selectedResponse.submittedAt).toLocaleString()}</p>
              </div>
              <div>
                <h3 className="font-semibold" style={{ color: palette.text.primary }}>Answers:</h3>
                <div className="space-y-2">
                  {selectedResponse.answers.map((answer, index) => (
                    <div key={index} className="rounded-lg border p-3" style={{ borderColor: palette.border.subtle, background: palette.surfaces.card }}>
                      <p className="font-medium" style={{ color: palette.text.primary }}>{answer.fieldLabel}</p>
                      <p className="text-sm" style={{ color: palette.text.secondary }}>{String(answer.value)}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  className="px-4 py-2 rounded-md border"
                  style={{
                    borderColor: palette.border.subtle,
                    background: palette.surfaces.card,
                    color: palette.text.primary,
                  }}
                  onClick={() => {
                    const csvContent = [
                      ["Field", "Answer"],
                      ...selectedResponse.answers.map((answer) => [answer.fieldLabel, String(answer.value)])
                    ].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
                    const blob = new Blob([csvContent], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `response-${selectedResponse.id}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Download CSV
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded-md border"
                  style={{
                    borderColor: palette.border.subtle,
                    background: palette.surfaces.card,
                    color: palette.text.primary,
                  }}
                  onClick={() => {
                    const jsonContent = JSON.stringify(selectedResponse, null, 2);
                    const blob = new Blob([jsonContent], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `response-${selectedResponse.id}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Download JSON
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded-md"
                  style={{
                    background: palette.accent.primary,
                    color: palette.text.inverse,
                  }}
                  onClick={() => setResponseModalOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {copyMessage ? (
        <div className="fixed right-6 top-6 z-60 rounded-md bg-black/80 px-3 py-2 text-sm text-white">
          {copyMessage}
        </div>
      ) : null}
    </div>
  );
}

