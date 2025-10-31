"use client";

import Link from "next/link";
import { useMemo } from "react";

import { mergeFlashlights, useTheme } from "@/app/components/theme/ThemeProvider";
import { useDashboardOverview } from "@/app/hooks/useDashboardOverview";

const features = [
  {
    title: "Real-time palette engine",
    description: "Blend dark and light surfaces with RGBA gradients that respond to live submissions and owner preferences.",
  },
  {
    title: "Structured form intelligence",
    description: "Reorder fields with haptic feedback, enforce schema with Zod, and preview instantly inside the same canvas.",
  },
  {
    title: "Response storytelling",
    description: "Dashboard pulses, share tokens, and analytics panels keep your team aligned on the story every submission tells.",
  },
];

export default function Home() {
  const { palette } = useTheme();
  const overviewState = useDashboardOverview();

  const flashlights = useMemo(
    () => mergeFlashlights(palette.flashlights, overviewState.data?.flashlights),
    [overviewState.data?.flashlights, palette.flashlights]
  );

  const gradient = useMemo(() => {
    const anchors = ["top left", "bottom right", "center"];
    return flashlights
      .map((flash, index) => `radial-gradient(circle at ${anchors[index % anchors.length]}, ${flash.color}, transparent 65%)`)
      .join(", ");
  }, [flashlights]);

  const totals = overviewState.data?.totals;

  return (
    <div className="flex flex-col gap-16 pb-20">
      <section
        className="relative overflow-hidden rounded-4xl border px-10 py-14 transition-colors duration-300"
        style={{
          borderColor: palette.border.subtle,
          background: palette.surfaces.panel,
          boxShadow: palette.shadows.xl,
        }}
      >
        <div className="absolute inset-0" style={{ background: gradient, opacity: 0.9 }} />
        <div className="relative z-10 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-8">
            <span
              className="inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-[0.32em]"
              style={{ border: `1px solid ${palette.border.subtle}`, color: palette.text.secondary }}
            >
              Intelligent form studio
            </span>
            <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight md:text-5xl" style={{ color: palette.text.primary }}>
              Craft cinematic forms with adaptive dark & light themes and RGBA flashlights fueled by live data.
            </h1>
            <p className="max-w-xl text-base" style={{ color: palette.text.secondary }}>
              Flow Studio synchronises the builder, dashboard, and share endpoints so every color, animation, and validation rule remains in concert with your database.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/builder"
                className="group inline-flex items-center gap-3 rounded-full px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] transition-transform duration-300"
                style={{
                  background: `linear-gradient(90deg, ${palette.accent.primary} 0%, ${palette.accent.secondary} 100%)`,
                  color: palette.text.inverse,
                  boxShadow: palette.shadows.lg,
                }}
              >
                Launch builder
                <span className="translate-y-px transition-transform duration-300 group-hover:translate-x-1">→</span>
              </Link>
              <Link
                href="/owner"
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] transition-colors duration-300"
                style={{ border: `1px solid ${palette.border.subtle}`, color: palette.text.secondary }}
              >
                View response stage
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[{
                label: "Forms live",
                value: totals ? totals.forms : "—",
              },
              {
                label: "Responses captured",
                value: totals ? totals.responses : "—",
              },
              {
                label: "Velocity (per day)",
                value: totals ? totals.responseVelocity.toFixed(1) : "—",
              },
              {
                label: "Avg completion (ms)",
                value: totals?.avgCompletionMs ?? "—",
              }].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border p-5 transition duration-300"
                  style={{
                    borderColor: palette.border.subtle,
                    background: palette.surfaces.card,
                    boxShadow: palette.shadows.lg,
                  }}
                >
                  <p className="text-2xl font-semibold" style={{ color: palette.text.primary }}>
                    {item.value}
                  </p>
                  <p className="text-xs uppercase tracking-[0.32em]" style={{ color: palette.text.muted }}>
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div
            className="relative overflow-hidden rounded-3xl border p-6"
            style={{
              borderColor: palette.border.subtle,
              background: palette.surfaces.card,
              boxShadow: palette.shadows.lg,
            }}
          >
            <div className="mb-5 flex items-center justify-between text-xs uppercase tracking-[0.3em]" style={{ color: palette.text.muted }}>
              <span>Live preview</span>
              <span>RGBA Sync</span>
            </div>
            <div className="space-y-4">
              {flashlights.map((flash) => (
                <div key={flash.id} className="relative overflow-hidden rounded-2xl border p-4" style={{ borderColor: palette.border.subtle }}>
                  <div className="absolute inset-0" style={{ background: `radial-gradient(circle at top, ${flash.color}, transparent 70%)` }} />
                  <div className="relative z-10 space-y-2">
                    <p className="text-sm font-semibold" style={{ color: palette.text.primary }}>
                      {flash.label}
                    </p>
                    <p className="text-xs" style={{ color: palette.text.secondary }}>
                      {flash.description}
                    </p>
                  </div>
                </div>
              ))}
              <div className="rounded-2xl border p-4" style={{ borderColor: palette.border.subtle }}>
                <p className="text-xs uppercase tracking-[0.3em]" style={{ color: palette.text.muted }}>
                  Builder → Share → Response
                </p>
                <p className="mt-2 text-sm" style={{ color: palette.text.secondary }}>
                  Better Auth protects each session while Prisma persists form definitions, response answers, and share tokens. Toggle themes and watch flashlights adapt instantly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="relative overflow-hidden rounded-3xl border p-8 transition duration-500 hover:-translate-y-2"
            style={{
              borderColor: palette.border.subtle,
              background: palette.surfaces.card,
              boxShadow: palette.shadows.lg,
            }}
          >
            <div
              className="absolute inset-0 opacity-0 transition-opacity duration-500 hover:opacity-100"
              style={{ background: "var(--surface-overlay)" }}
            />
            <div className="relative z-10 flex flex-col gap-4">
              <span
                className="inline-flex w-fit items-center rounded-full px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.32em]"
                style={{ border: `1px solid ${palette.border.subtle}`, color: palette.text.secondary }}
              >
                Spotlight
              </span>
              <h3 className="text-2xl font-semibold" style={{ color: palette.text.primary }}>
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: palette.text.secondary }}>
                {feature.description}
              </p>
            </div>
          </div>
        ))}
      </section>

      <section
        className="grid gap-10 rounded-3xl border px-8 py-10 transition duration-300 lg:grid-cols-[1fr_1.1fr]"
        style={{
          borderColor: palette.border.subtle,
          background: palette.surfaces.panel,
          boxShadow: palette.shadows.xl,
        }}
      >
        <div className="space-y-6">
          <span
            className="inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-[0.32em]"
            style={{ border: `1px solid ${palette.border.subtle}`, color: palette.text.secondary }}
          >
            Owner dashboard
          </span>
          <h2 className="text-[2.2rem] font-semibold leading-tight" style={{ color: palette.text.primary }}>
            Share links, response analytics, and RGBA flashlights woven directly into your Prisma data.
          </h2>
          <p className="text-sm" style={{ color: palette.text.secondary }}>
            Invite collaborators with expiring share tokens, review submissions in a theme-aware console, and let dynamic gradients highlight momentum.
          </p>
          <Link
            href="/owner"
            className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold uppercase tracking-[0.32em] transition duration-300"
            style={{
              background: palette.accent.secondary,
              color: palette.text.inverse,
              boxShadow: palette.shadows.lg,
            }}
          >
            Enter response space →
          </Link>
        </div>
        <div className="space-y-4">
          {(overviewState.data?.recentResponses ?? []).slice(0, 4).map((response) => (
            <div key={response.id} className="rounded-2xl border p-4" style={{ borderColor: palette.border.subtle, background: palette.surfaces.card }}>
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em]" style={{ color: palette.text.muted }}>
                <span>{response.formTitle}</span>
                <span>{new Date(response.submittedAt).toLocaleDateString()}</span>
              </div>
              <p className="mt-3 text-sm" style={{ color: palette.text.primary }}>
                {response.highlight ?? "Submission captured with custom theme."}
              </p>
            </div>
          ))}
          {(overviewState.data?.recentResponses?.length ?? 0) === 0 ? (
            <p className="text-sm" style={{ color: palette.text.muted }}>
              Share a form to see responses animate in both dark and light mode.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
