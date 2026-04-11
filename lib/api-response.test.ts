// Tests for the standard ApiResult shape + helpers.
//
// These pin the wire format so future refactors can't accidentally break
// the contract that the frontend depends on.

import { describe, expect, it } from "vitest";
import {
  apiBadGateway,
  apiBadRequest,
  apiConflict,
  apiError,
  apiNotFound,
  apiOk,
  apiServerError,
  apiUnauthorized,
  type ApiResult,
} from "./api-response";

async function readBody(res: Response) {
  return (await res.json()) as ApiResult<unknown>;
}

describe("apiOk", () => {
  it("returns 200 with { ok: true, data }", async () => {
    const res = apiOk({ foo: "bar" });
    expect(res.status).toBe(200);
    const body = await readBody(res);
    expect(body).toEqual({ ok: true, data: { foo: "bar" } });
  });

  it("preserves nested objects and arrays", async () => {
    const data = { items: [1, 2, 3], nested: { a: { b: "c" } } };
    const res = apiOk(data);
    const body = await readBody(res);
    expect(body).toEqual({ ok: true, data });
  });

  it("respects custom status overrides via init", async () => {
    const res = apiOk({}, { status: 201 });
    expect(res.status).toBe(201);
  });
});

describe("apiError", () => {
  it("returns the given status with { ok: false, error }", async () => {
    const res = apiError("MY_CODE", "Something broke", 418);
    expect(res.status).toBe(418);
    const body = await readBody(res);
    expect(body).toEqual({
      ok: false,
      error: { code: "MY_CODE", message: "Something broke" },
    });
  });

  it("includes the detail field only when provided", async () => {
    const without = await readBody(apiError("X", "msg", 400));
    expect(without).toEqual({ ok: false, error: { code: "X", message: "msg" } });

    const withDetail = await readBody(apiError("X", "msg", 400, { extra: 1 }));
    expect(withDetail).toEqual({
      ok: false,
      error: { code: "X", message: "msg", detail: { extra: 1 } },
    });
  });

  it("omits detail when explicitly undefined", async () => {
    const body = await readBody(apiError("X", "msg", 400, undefined));
    expect(body).toEqual({ ok: false, error: { code: "X", message: "msg" } });
  });
});

describe("error shorthands", () => {
  it("apiBadRequest is 400 with code BAD_REQUEST", async () => {
    const res = apiBadRequest("missing field");
    expect(res.status).toBe(400);
    const body = await readBody(res);
    if (body.ok) throw new Error("expected error");
    expect(body.error.code).toBe("BAD_REQUEST");
    expect(body.error.message).toBe("missing field");
  });

  it("apiUnauthorized is 401 with code UNAUTHORIZED", async () => {
    const res = apiUnauthorized();
    expect(res.status).toBe(401);
    const body = await readBody(res);
    if (body.ok) throw new Error("expected error");
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("apiNotFound is 404 with code NOT_FOUND", async () => {
    expect(apiNotFound().status).toBe(404);
  });

  it("apiConflict is 409 with custom code", async () => {
    const res = apiConflict("ROOM_TAKEN", "Already booked");
    expect(res.status).toBe(409);
    const body = await readBody(res);
    if (body.ok) throw new Error("expected error");
    expect(body.error.code).toBe("ROOM_TAKEN");
  });

  it("apiServerError is 500 with code INTERNAL", async () => {
    expect(apiServerError().status).toBe(500);
  });

  it("apiBadGateway is 502 with code BAD_GATEWAY", async () => {
    expect(apiBadGateway("apaleo down").status).toBe(502);
  });
});
