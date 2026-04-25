import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import type { TenantDocumentCategory } from "@/lib/generated/prisma/client";

const VALID_CATEGORIES: TenantDocumentCategory[] = [
  "CONTRACT",
  "COMPLIANCE",
  "FINANCIAL",
  "CORRESPONDENCE",
  "OTHER",
];

/**
 * GET /api/admin/tenants/[id]/documents
 *   → list documents (tenant-scoped)
 * POST /api/admin/tenants/[id]/documents
 *   body: { filename, url, category, description? }
 *   → create a document metadata row. We don't handle binary upload
 *   here, caller is responsible for putting the PDF somewhere
 *   publicly fetchable (typically Google Drive) and passing the URL.
 */
export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const docs = await prisma.tenantDocument.findMany({
    where: { tenantId: id },
    orderBy: { uploadedAt: "desc" },
  });
  return Response.json({ documents: docs });
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const body = await request.json();
  const { filename, url, category, description } = body;

  if (!filename || typeof filename !== "string") {
    return Response.json({ error: "filename required" }, { status: 400 });
  }
  if (!url || typeof url !== "string") {
    return Response.json({ error: "url required" }, { status: 400 });
  }
  const cat = (category as TenantDocumentCategory) ?? "OTHER";
  if (!VALID_CATEGORIES.includes(cat)) {
    return Response.json({ error: "Invalid category" }, { status: 400 });
  }

  const doc = await prisma.tenantDocument.create({
    data: {
      tenantId: id,
      filename: filename.trim(),
      url: url.trim(),
      category: cat,
      description: description ? String(description).trim() : null,
    },
  });

  await audit(request, {
    module: "tenant",
    action: "document_added",
    entityType: "tenant",
    entityId: id,
    summary: `Added document "${filename}" (${cat})`,
    metadata: { documentId: doc.id, category: cat, filename },
  });

  return Response.json({ id: doc.id });
}
