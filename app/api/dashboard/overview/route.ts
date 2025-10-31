import { NextResponse } from "next/server";

import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import type { Prisma } from "@prisma/client";

async function ensureSession(request: Request) {
  const result = await auth.api.getSession({ headers: request.headers });
  if (!result || !result.user) {
    console.log("[ensureSession] Session not found or invalid. Possible causes: invalid secret, baseURL mismatch, expired session, or cookie parsing error.");
    return null;
  }
  return { user: result.user, session: result.session };
}

type FlashlightPulse = {
  id: string;
  label: string;
  color: string;
  halo: string;
  description: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function extractSummary(answers: Array<{ value: Prisma.JsonValue }>) {
  for (const answer of answers) {
    const { value } = answer;
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
    if (typeof value === "number") {
      return String(value);
    }
    if (Array.isArray(value) && value.length > 0) {
      const filtered = value.filter((item): item is string => typeof item === "string");
      if (filtered.length > 0) {
        return filtered.join(", ");
      }
    }
  }
  return null;
}

function buildTimeseries(responses: { submittedAt: Date }[], days = 10) {
  const map = new Map<string, number>();
  const now = new Date();

  for (let offset = 0; offset < days; offset += 1) {
    const target = new Date(now);
    target.setDate(now.getDate() - offset);
    const key = target.toISOString().slice(0, 10);
    map.set(key, 0);
  }

  responses.forEach((item) => {
    const key = item.submittedAt.toISOString().slice(0, 10);
    if (map.has(key)) {
      map.set(key, (map.get(key) ?? 0) + 1);
    }
  });

  return Array.from(map.entries())
    .map(([date, responsesCount]) => ({ date, responses: responsesCount }))
    .sort((a, b) => (a.date > b.date ? 1 : -1));
}

function buildFlashlights(base: FlashlightPulse[], metrics: { forms: number; responses: number; velocity: number; avgCompletionMs: number | null }) {
  const { forms, responses, velocity, avgCompletionMs } = metrics;

  const responseAlpha = clamp(0.18 + responses / 180, 0.18, 0.5);
  const formAlpha = clamp(0.16 + forms / 40, 0.16, 0.38);
  const velocityAlpha = clamp(0.2 + velocity / 60, 0.2, 0.48);
  const completionAlpha = clamp(0.18 + (avgCompletionMs ? 240000 / (avgCompletionMs + 1) : 0.22), 0.18, 0.42);

  return base.map((flash) => {
    switch (flash.id) {
      case "aurora":
        return {
          ...flash,
          color: flash.color.replace(/0\.\d+\)$/g, `${responseAlpha.toFixed(2)})`),
          halo: flash.halo.replace(/0\.\d+\)$/g, `${clamp(responseAlpha * 0.6, 0.12, 0.32).toFixed(2)})`),
          description: `${responses} responses captured`,
        };
      case "velvet":
        return {
          ...flash,
          color: flash.color.replace(/0\.\d+\)$/g, `${formAlpha.toFixed(2)})`),
          halo: flash.halo.replace(/0\.\d+\)$/g, `${clamp(formAlpha * 0.6, 0.1, 0.26).toFixed(2)})`),
          description: `${forms} forms live`,
        };
      case "lumen":
        return {
          ...flash,
          color: flash.color.replace(/0\.\d+\)$/g, `${clamp(Math.max(velocityAlpha, completionAlpha), 0.18, 0.48).toFixed(2)})`),
          halo: flash.halo.replace(/0\.\d+\)$/g, `${clamp(Math.max(velocityAlpha, completionAlpha) * 0.55, 0.12, 0.3).toFixed(2)})`),
          description: velocity > 0 ? `${velocity.toFixed(1)} responses / day` : "Awaiting momentum",
        };
      default:
        return flash;
    }
  });
}

export async function GET(request: Request) {
  const session = await ensureSession(request);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ownerId = session.user.id;

  const [forms, totalResponses, averageCompletion, recentResponses] = await Promise.all([
    prisma.form.findMany({
      where: { ownerId },
      include: {
        _count: { select: { responses: true, fields: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.formResponse.count({ where: { form: { ownerId } } }),
    prisma.formResponse.aggregate({
      where: { form: { ownerId } },
      _avg: { completionMs: true },
    }),
    prisma.formResponse.findMany({
      where: { form: { ownerId } },
      orderBy: { submittedAt: "desc" },
      take: 120,
      include: {
        form: {
          select: {
            id: true,
            title: true,
          },
        },
        answers: {
          select: {
            value: true,
            field: {
              select: {
                label: true,
                type: true,
              },
            },
          },
          take: 3,
        },
      },
    }),
  ]);

  const timeseries = buildTimeseries(recentResponses);
  const avgDaily = timeseries.reduce((acc, item) => acc + item.responses, 0) / (timeseries.length || 1);

  const topForms = forms
    .map((form) => ({
      id: form.id,
      title: form.title,
      responses: form._count.responses,
      fields: form._count.fields,
    }))
    .sort((a, b) => b.responses - a.responses)
    .slice(0, 5);

  const flashlights = buildFlashlights(
    [
      {
        id: "aurora",
        label: "Aurora Beam",
        color: "rgba(56,189,248,0.34)",
        halo: "rgba(56,189,248,0.18)",
        description: "",
      },
      {
        id: "velvet",
        label: "Velvet Pulse",
        color: "rgba(236,72,153,0.28)",
        halo: "rgba(236,72,153,0.16)",
        description: "",
      },
      {
        id: "lumen",
        label: "Lumen Drift",
        color: "rgba(129,140,248,0.26)",
        halo: "rgba(129,140,248,0.14)",
        description: "",
      },
    ],
    {
      forms: forms.length,
      responses: totalResponses,
      velocity: avgDaily,
      avgCompletionMs: averageCompletion._avg.completionMs ?? null,
    }
  );

  const recentResponseSummaries = recentResponses.slice(0, 6).map((response) => ({
    id: response.id,
    formId: response.formId,
    formTitle: response.form.title,
    submittedAt: response.submittedAt.toISOString(),
    completionMs: response.completionMs,
    highlight: extractSummary(response.answers),
  }));

  const overview = {
    ownerId,
    totals: {
      forms: forms.length,
      responses: totalResponses,
      avgCompletionMs: averageCompletion._avg.completionMs ?? null,
      responseVelocity: Number.isFinite(avgDaily) ? Number(avgDaily.toFixed(1)) : 0,
    },
    timeseries,
    topForms,
    flashlights,
    recentResponses: recentResponseSummaries,
  };

  return NextResponse.json({ overview });
}
