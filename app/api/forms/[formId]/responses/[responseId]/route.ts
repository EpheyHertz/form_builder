import { NextResponse } from "next/server";

import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

async function ensureSession(request: Request) {
  const result = await auth.api.getSession({ headers: request.headers });
  if (!result || !result.user) {
    return null;
  }
  return { user: result.user, session: result.session };
}

export async function GET(request: Request, { params }: { params: Promise<{ formId: string; responseId: string }> }) {
  const session = await ensureSession(request);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { formId, responseId } = await params;

  const form = await prisma.form.findFirst({
    where: {
      id: formId,
      ownerId: session.user.id,
    },
  });

  if (!form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  const response = await prisma.formResponse.findFirst({
    where: {
      id: responseId,
      formId: form.id,
    },
    select: {
      id: true,
      formId: true,
      submittedAt: true,
      completionMs: true,
      metadata: true,
      answers: {
        orderBy: {
          field: {
            sortOrder: "asc",
          },
        },
        select: {
          id: true,
          fieldId: true,
          value: true,
          field: {
            select: {
              label: true,
              type: true,
            },
          },
        },
      },
    },
  });

  if (!response) {
    return NextResponse.json({ error: "Response not found" }, { status: 404 });
  }

  const payload = {
    id: response.id,
    formId: response.formId,
    submittedAt: response.submittedAt.toISOString(),
    completionMs: response.completionMs ?? null,
    meta: response.metadata ?? undefined,
    answers: response.answers.map((answer) => ({
      id: answer.id,
      fieldId: answer.fieldId,
      fieldLabel: answer.field.label,
      type: answer.field.type,
      value: answer.value,
    })),
  };

  return NextResponse.json({ response: payload });
}