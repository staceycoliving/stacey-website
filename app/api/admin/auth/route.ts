import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { env } from "@/lib/env";
import { adminAuthLimiter, checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

const ADMIN_PASSWORD = env.ADMIN_PASSWORD;
const SESSION_COOKIE = "admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function createToken(password: string): string {
  return crypto
    .createHmac("sha256", password)
    .update("stacey-admin-session")
    .digest("hex");
}

export async function POST(request: NextRequest) {
  const limit = await checkRateLimit(adminAuthLimiter, request);
  if (!limit.success) return rateLimitResponse(limit);

  const body = await request.json();
  const { password } = body;

  if (!password || password !== ADMIN_PASSWORD) {
    return Response.json({ error: "Wrong password" }, { status: 401 });
  }

  const token = createToken(ADMIN_PASSWORD);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  return Response.json({ ok: true });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  return Response.json({ ok: true });
}
