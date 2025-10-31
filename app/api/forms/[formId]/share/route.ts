import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes, createHash } from "node:crypto";

import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

async function ensureSession(request: Request) {
  const result = await auth.api.getSession({ headers: request.headers });
  if (!result || !result.user) {
    console.log("[ensureSession] Session not found or invalid. Possible causes: invalid secret, baseURL mismatch, expired session, or cookie parsing error.");
    return null;
  }
  return { user: result.user, session: result.session };
}

const shareLinkSchema = z.object({
  expiresAt: z.string().datetime().optional(),
  password: z.string().min(6, "Password must be at least 6 characters").max(64).optional(),
});


export async function POST(request: Request, context: { params: Promise<{ formId: string }> }) {
  const { formId } = await context.params;
  const session = await ensureSession(request);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => ({}));
  const parsed = shareLinkSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 422 }
    );
  }

  const payload = parsed.data;
  const form = await prisma.form.findFirst({
    where: {
      id: formId,
      ownerId: session.user.id,
    },
    select: {
      id: true,
      ownerId: true,
    },
  });

  if (!form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  const expiresAt = payload.expiresAt ? new Date(payload.expiresAt) : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    return NextResponse.json({ error: "expiresAt must be a valid ISO date" }, { status: 400 });
  }

  // Check if a share token already exists for this form
  const existing = await prisma.formShareToken.findFirst({
    where: { formId: form.id },
    orderBy: { createdAt: "desc" },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

  if (existing) {
    const shareLink = {
      id: existing.id,
      formId: existing.formId,
      token: existing.token,
      url: `${normalizedBaseUrl}/share/${existing.token}`,
      expiresAt: existing.expiresAt ? existing.expiresAt.toISOString() : null,
      requiresPassword: Boolean(existing.passwordHash),
      createdAt: existing.createdAt.toISOString(),
    };
    return NextResponse.json({ share: shareLink }, { status: 200 });
  }

  // If not, create a new one
  const token = randomBytes(16).toString("hex");
  const passwordHash = payload.password
    ? createHash("sha256").update(payload.password).digest("hex")
    : null;
  const created = await prisma.formShareToken.create({
    data: {
      formId: form.id,
      ownerId: form.ownerId,
      token,
      passwordHash,
      expiresAt,
    },
  });
  const shareLink = {
    id: created.id,
    formId: created.formId,
    token: created.token,
    url: `${normalizedBaseUrl}/share/${created.token}`,
    expiresAt: created.expiresAt ? created.expiresAt.toISOString() : null,
    requiresPassword: Boolean(created.passwordHash),
    createdAt: created.createdAt.toISOString(),
  };
  return NextResponse.json({ share: shareLink }, { status: 201 });
}
