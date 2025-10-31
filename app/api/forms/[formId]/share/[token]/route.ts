import { NextResponse } from "next/server";

import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

async function ensureSession(request: Request) {
  const result = await auth.api.getSession({ headers: request.headers });
  return (result as { data?: { user?: { id: string } } } | null)?.data ?? null;
}

export async function DELETE(request: Request, { params }: { params: Promise<{ formId: string; token: string }> }) {
  const session = await ensureSession(request);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { formId, token } = await params;

  const shareToken = await prisma.formShareToken.findUnique({
    where: { token: token },
    select: {
      id: true,
      formId: true,
      ownerId: true,
      token: true,
    },
  });

  if (!shareToken || shareToken.formId !== formId || shareToken.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Share link not found" }, { status: 404 });
  }

  await prisma.formShareToken.delete({
    where: {
      token: shareToken.token,
    },
  });

  const summary = {
    formId: shareToken.formId,
    token: shareToken.token,
    revokedAt: new Date().toISOString(),
    status: "revoked" as const,
  };

  return NextResponse.json({ shareLink: summary });
}
