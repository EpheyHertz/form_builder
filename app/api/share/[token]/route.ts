import { NextResponse } from "next/server";

import { prisma } from "@/app/lib/prisma";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  console.log("[GET /api/share/[token]] Token:", token);
  const share = await prisma.formShareToken.findFirst({
    where: {
      token: token,
    },
    include: {
      form: {
        select: {
          id: true,
          title: true,
          description: true,
          fields: {
            orderBy: {
              sortOrder: "asc",
            },
            select: {
              id: true,
              label: true,
              type: true,
              required: true,
              options: true,
            },
          },
        },
      },
    },
  });

  console.log("[GET /api/share/[token]] Share found:", !!share);

  if (!share) {
    return NextResponse.json({ error: "Share link not found" }, { status: 404 });
  }

  if (share.expiresAt && share.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "Share link expired" }, { status: 410 });
  }

  const response = {
    token: share.token,
    form: {
      id: share.form.id,
      title: share.form.title,
      fields: share.form.fields.map((field) => ({
        id: field.id,
        label: field.label,
        type: field.type,
        required: field.required,
        options: field.options,
      })),
    },
    permissions: {
      anonymousSubmissionAllowed: true,
      requiresPassword: Boolean(share.passwordHash),
    },
    expiresAt: share.expiresAt ? share.expiresAt.toISOString() : null,
    createdAt: share.createdAt.toISOString(),
  };

  return NextResponse.json(response);
}
