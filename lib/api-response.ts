// Standard response shape for every public API route the frontend calls.
//
// Every handler returns a `Result<T>`:
//   - { ok: true,  data: T }
//   - { ok: false, error: { code, message, detail? } }
//
// Why a discriminated union: TypeScript narrows on the `ok` field, so
// frontend code reads like
//
//     const r = await fetchJson<MyData>("/api/foo");
//     if (!r.ok) { showError(r.error.message); return; }
//     // r.data is fully typed here
//
// instead of the previous ad-hoc mix of `{ error: "..." }`, `{ details: "..." }`,
// raw fields, plain strings, etc.
//
// Webhook / cron / admin routes are NOT migrated to this — they have their
// own contracts with external systems (Stripe, Vercel cron, internal admin
// frontend) and changing them would create churn without benefit.

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

export type ApiError = {
  /** Stable, machine-readable code. UPPER_SNAKE_CASE. */
  code: string;
  /** Human-readable message safe to surface to end users. */
  message: string;
  /** Optional debug info — never assume the frontend will render this. */
  detail?: unknown;
};

// ─── Server: build responses ────────────────────────────────

/** 200 OK with a typed payload. */
export function apiOk<T>(data: T, init?: ResponseInit): Response {
  return Response.json({ ok: true, data } satisfies ApiResult<T>, {
    status: 200,
    ...init,
  });
}

/** Non-2xx with a structured error body. */
export function apiError(
  code: string,
  message: string,
  status: number,
  detail?: unknown,
): Response {
  const body: ApiResult<never> = {
    ok: false,
    error: detail !== undefined ? { code, message, detail } : { code, message },
  };
  return Response.json(body, { status });
}

// Common shorthands for the most frequent failure modes
export const apiBadRequest = (msg: string, detail?: unknown) =>
  apiError("BAD_REQUEST", msg, 400, detail);
export const apiUnauthorized = (msg = "Unauthorized") =>
  apiError("UNAUTHORIZED", msg, 401);
export const apiNotFound = (msg = "Not found") =>
  apiError("NOT_FOUND", msg, 404);
export const apiConflict = (code: string, msg: string, detail?: unknown) =>
  apiError(code, msg, 409, detail);
export const apiServerError = (msg = "Internal server error", detail?: unknown) =>
  apiError("INTERNAL", msg, 500, detail);
export const apiBadGateway = (msg: string, detail?: unknown) =>
  apiError("BAD_GATEWAY", msg, 502, detail);

// ─── Client: read responses ─────────────────────────────────

/**
 * Fetch a JSON endpoint and parse it into ApiResult<T>. Network errors and
 * non-JSON bodies are mapped into the error branch so callers always get
 * a result, never a thrown exception.
 */
export async function fetchJson<T>(
  input: string | URL | Request,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch (err) {
    return {
      ok: false,
      error: {
        code: "NETWORK",
        message: err instanceof Error ? err.message : "Network error",
      },
    };
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return {
      ok: false,
      error: { code: "INVALID_JSON", message: `Server returned ${res.status} with non-JSON body` },
    };
  }

  // The body should already be in ApiResult shape — if it is, return as-is.
  if (
    body &&
    typeof body === "object" &&
    "ok" in body &&
    typeof (body as { ok: unknown }).ok === "boolean"
  ) {
    return body as ApiResult<T>;
  }

  // Legacy / non-migrated endpoint: wrap based on HTTP status.
  if (res.ok) return { ok: true, data: body as T };
  return {
    ok: false,
    error: {
      code: `HTTP_${res.status}`,
      message:
        body && typeof body === "object" && "error" in body && typeof body.error === "string"
          ? (body as { error: string }).error
          : `Request failed with status ${res.status}`,
      detail: body,
    },
  };
}
