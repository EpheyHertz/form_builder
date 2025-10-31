import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import type { Prisma } from "@prisma/client";

type ResponseWithAnswers = Prisma.FormResponseGetPayload<{
  include: {
    answers: {
      select: {
        id: true;
        fieldId: true;
        value: true;
        field: {
          select: {
            label: true;
            type: true;
          };
        };
      };
    };
  };
}>;

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

export async function GET(request: Request, { params }: { params: Promise<{ formId: string }> }) {
  const session = await ensureSession(request);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { formId } = await params;

  const form = await prisma.form.findFirst({
    where: {
      id: formId,
      ownerId: session.user.id,
    },
    select: {
      id: true,
      fields: {
        select: {
          id: true,
          sortOrder: true,
          label: true,
        },
      },
    },
  });

  if (!form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  const sortOrderMap = new Map(form.fields.map((field) => [field.id, field.sortOrder]));

  const responses = await prisma.formResponse.findMany({
    where: {
      formId: form.id,
    },
    orderBy: {
      submittedAt: "desc",
    },
    include: {
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

  const payload = responses.map((response) => ({
    id: response.id,
    formId: response.formId,
    submittedAt: response.submittedAt.toISOString(),
    completionMs: response.completionMs ?? undefined,
    meta: response.metadata ?? undefined,
    answers: response.answers
      .slice()
      .sort((a, b) => (sortOrderMap.get(a.fieldId) ?? 0) - (sortOrderMap.get(b.fieldId) ?? 0))
      .map((answer) => ({
        id: answer.id,
        fieldId: answer.fieldId,
        label: answer.field.label,
        type: answer.field.type,
        value: answer.value,
      })),
  }));

  return NextResponse.json({ formId: formId, responses: payload });
}

const answerSchema = z.object({
  fieldId: z.string().min(1, "Field ID is required"),
  value: z.union([z.string(), z.array(z.string()), z.number(), z.boolean(), z.null()]),
});

const createResponseSchema = z.object({
  completionMs: z.number().int().positive().max(1000 * 60 * 30).optional(),
  answers: z.array(answerSchema).min(1, "At least one answer is required"),
  meta: z
    .object({
      fingerprint: z.string().optional(),
      timezone: z.string().optional(),
      userAgent: z.string().optional(),
    })
    .optional(),
  honey: z.string().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ formId: string }> }) {
  const session = await ensureSession(request);
  console.log("[POST] Session data:", session);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { formId } = await params;

  const json = await request.json().catch(() => ({}));
  const parsed = createResponseSchema.safeParse(json);

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

  if (payload.honey && payload.honey.trim().length > 0) {
    return NextResponse.json({ error: "Suspicious submission detected" }, { status: 400 });
  }

  const form = await prisma.form.findFirst({
    where: {
      id: formId,
      ownerId: session.user.id,
    },
    include: {
      fields: {
        select: {
          id: true,
          type: true,
          required: true,
          options: true,
          sortOrder: true,
        },
      },
    },
  });

  if (!form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  const fieldMap = new Map(form.fields.map((field) => [field.id, field]));

  const issues: { fieldId: string; message: string }[] = [];
  const answersToPersist: { fieldId: string; value: Prisma.InputJsonValue }[] = [];

  // Flag answers targeting fields outside this form.
  payload.answers.forEach((answer) => {
    if (!fieldMap.has(answer.fieldId)) {
      issues.push({ fieldId: answer.fieldId, message: "Field does not belong to this form" });
    }
  });

  const parseOptions = (raw: unknown): string[] => {
    if (!raw || !Array.isArray(raw)) {
      return [];
    }

    return raw
      .map((item) => {
        if (item && typeof item === "object" && "value" in item) {
          const value = (item as Record<string, unknown>).value;
          return typeof value === "string" ? value : null;
        }
        return null;
      })
      .filter((value): value is string => Boolean(value));
  };

  const ensureString = (value: unknown) => (typeof value === "string" ? value : null);

  const ensureStringArray = (value: unknown) => {
    if (!Array.isArray(value)) {
      return null;
    }
    const result = value.filter((entry): entry is string => typeof entry === "string");
    return result;
  };

  const isValidDate = (value: string) => {
    if (!value) return false;
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp);
  };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  form.fields.forEach((field) => {
    const answer = payload.answers.find((entry) => entry.fieldId === field.id);

    if (!answer) {
      if (field.required) {
        issues.push({ fieldId: field.id, message: "Required field is missing" });
      }
      return;
    }

    const rawValue = answer.value;
    const options = parseOptions(field.options ?? undefined);

    const addIssue = (message: string) => {
      issues.push({ fieldId: field.id, message });
    };

    const pushAnswer = (value: Prisma.InputJsonValue) => {
      answersToPersist.push({ fieldId: field.id, value });
    };

    switch (field.type) {
      case "short_text":
      case "long_text": {
        const value = ensureString(rawValue)?.trim() ?? "";
        if (field.required && value.length === 0) {
          addIssue("Response is required");
          return;
        }
        if (!field.required && value.length === 0) {
          return;
        }
        pushAnswer(value);
        return;
      }
      case "email": {
        const value = ensureString(rawValue)?.trim() ?? "";
        if (field.required && value.length === 0) {
          addIssue("Email is required");
          return;
        }
        if (value.length > 0 && !emailRegex.test(value)) {
          addIssue("Email format looks invalid");
          return;
        }
        if (!field.required && value.length === 0) {
          return;
        }
        pushAnswer(value);
        return;
      }
      case "number": {
        let value: number | null = null;

        if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
          value = rawValue;
        } else if (typeof rawValue === "string") {
          const trimmed = rawValue.trim();
          if (trimmed.length === 0) {
            if (field.required) {
              addIssue("Number is required");
            }
            return;
          }
          const parsed = Number(trimmed);
          if (Number.isFinite(parsed)) {
            value = parsed;
          }
        }

        if (value === null) {
          if (field.required) {
            addIssue("Number is required");
          } else {
            addIssue("Number could not be parsed");
          }
          return;
        }

        pushAnswer(value);
        return;
      }
      case "dropdown": {
        const value = ensureString(rawValue) ?? "";
        if (field.required && value.length === 0) {
          addIssue("Selection is required");
          return;
        }
        if (value.length === 0) {
          return;
        }
        if (options.length > 0 && !options.includes(value)) {
          addIssue("Selected option is invalid");
          return;
        }
        pushAnswer(value);
        return;
      }
      case "checkbox": {
        const values = ensureStringArray(rawValue);
        if (!values || values.length === 0) {
          if (field.required) {
            addIssue("At least one option is required");
          }
          return;
        }
        if (options.length > 0) {
          const invalid = values.filter((entry) => !options.includes(entry));
          if (invalid.length > 0) {
            addIssue("One or more options are invalid");
            return;
          }
        }
        pushAnswer(values);
        return;
      }
      case "date": {
        const value = ensureString(rawValue) ?? "";
        if (field.required && value.length === 0) {
          addIssue("Date is required");
          return;
        }
        if (value.length > 0 && !isValidDate(value)) {
          addIssue("Date could not be parsed");
          return;
        }
        if (!field.required && value.length === 0) {
          return;
        }
        pushAnswer(value);
        return;
      }
      default: {
        addIssue("Unsupported field type");
      }
    }
  });

  // Ensure required answers are not silently skipped.
  form.fields
    .filter((field) => field.required)
    .forEach((field) => {
      if (!answersToPersist.find((answer) => answer.fieldId === field.id)) {
        issues.push({ fieldId: field.id, message: "Required field is missing" });
      }
    });

  if (issues.length > 0) {
    return NextResponse.json(
      {
        error: "Validation failed",
        issues: issues.map((issue) => ({
          path: issue.fieldId,
          message: issue.message,
        })),
      },
      { status: 422 }
    );
  }

  const forwardedFor = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");
  const ipAddress = forwardedFor?.split(",")[0]?.trim();

  const serverUserAgent = request.headers.get("user-agent") ?? undefined;

  const metadata: Record<string, unknown> = {
    ...payload.meta,
    ipAddress,
    userAgent: payload.meta?.userAgent ?? serverUserAgent,
    timezone: payload.meta?.timezone,
    fingerprint: payload.meta?.fingerprint,
  };

  Object.keys(metadata).forEach((key) => {
    if (metadata[key] === undefined || metadata[key] === null) {
      delete metadata[key];
    }
  });

  const created: ResponseWithAnswers = await prisma.formResponse.create({
    data: {
      formId: form.id,
      completionMs: payload.completionMs,
      metadata: Object.keys(metadata).length > 0 ? (metadata as Prisma.InputJsonObject) : undefined,
      answers: {
        create: answersToPersist.map((answer) => ({
          value: answer.value,
          field: {
            connect: { id: answer.fieldId },
          },
        })),
      },
    },
    include: {
      answers: {
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

  const responsePayload = {
    id: created.id,
    formId: created.formId,
    submittedAt: created.submittedAt.toISOString(),
    completionMs: created.completionMs ?? undefined,
    meta: created.metadata ?? undefined,
    answers: created.answers.map((answer) => ({
      id: answer.id,
      fieldId: answer.fieldId,
      label: answer.field.label,
      type: answer.field.type,
      value: answer.value,
    })),
  };

  return NextResponse.json({ response: responsePayload }, { status: 201 });
}
