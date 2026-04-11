import { cookies } from "next/headers";
import crypto from "crypto";
import { env } from "./env";

const ADMIN_PASSWORD = env.ADMIN_PASSWORD;
const SESSION_COOKIE = "admin_session";

function createToken(password: string): string {
  return crypto
    .createHmac("sha256", password)
    .update("stacey-admin-session")
    .digest("hex");
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE);
  if (!session) return false;
  return session.value === createToken(ADMIN_PASSWORD);
}
