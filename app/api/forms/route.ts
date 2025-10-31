import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";

async function ensureSession(request: Request) {
  // Debug: log full request headers and session parsing details
  const cookieHeader = request.headers.get("cookie");
  console.log("[ensureSession] Incoming cookie header:", cookieHeader);
  console.log("[ensureSession] All request headers:", Object.fromEntries(request.headers.entries()));
  const result = await auth.api.getSession({ headers: request.headers });
  console.log("[ensureSession] Session lookup result:", result);
  if (!result || !result.user) {
    console.log("[ensureSession] Session not found or invalid. Possible causes: invalid secret, baseURL mismatch, expired session, or cookie parsing error.");
    return null;
  }
  return { user: result.user, session: result.session };
}

const createFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().max(500).optional(),
  themePreset: z.string().optional(),
  fields: z
    .array(
      z.object({
        id: z.string().optional(),
        label: z.string().min(1),
        type: z.string(),
        required: z.boolean().optional(),
        options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
      })
    )
    .optional(),
});

export async function POST(request: Request) {
  const session = await ensureSession(request);
  console.log("[POST] Session data:", session);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => ({}));
  const parsed = createFormSchema.safeParse(json);

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

  // prepare nested fields if provided
  const fieldsToCreate = (payload.fields ?? []).map((f, idx) => ({
    label: f.label,
    type: f.type,
    required: Boolean(f.required),
    options: f.options ?? null,
    sortOrder: idx,
  }));

  // Create the form first, then create fields in a separate step to avoid complex nested typing
  const createdFormBase = await prisma.form.create({
    data: {
      ownerId: session.user.id,
      title: payload.title,
      description: payload.description,
    },
  });

  if (fieldsToCreate.length > 0) {
    // attach formId to each field
    const createManyData = fieldsToCreate.map((f) => ({
      ...f,
      formId: createdFormBase.id,
      options: f.options != null ? (f.options as unknown as Prisma.InputJsonValue) : undefined,
    }));
    await prisma.formField.createMany({ data: createManyData });
  }

  const createdForm = await prisma.form.findUnique({
    where: { id: createdFormBase.id },
    include: {
      fields: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, label: true, type: true, required: true, options: true },
      },
    },
  });

  if (!createdForm) {
    return NextResponse.json({ error: "Failed to create form" }, { status: 500 });
  }

  const formResponse = {
    id: createdForm.id,
    title: createdForm.title,
    description: createdForm.description,
    themePreset: payload.themePreset ?? null,
    ownerId: createdForm.ownerId,
    status: "draft" as const,
    createdAt: createdForm.createdAt.toISOString(),
    updatedAt: createdForm.updatedAt.toISOString(),
    fields: createdForm.fields.map((field) => ({
      id: field.id,
      label: field.label,
      type: field.type,
      required: field.required,
      options: field.options as Prisma.JsonValue | null,
    })),
  };

  return NextResponse.json({ form: formResponse }, { status: 201 });
}
