import { test, expect, describe, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const COOKIE_NAME = "auth-token";

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

// Mock jose to avoid jsdom Uint8Array incompatibility
const mockSign = vi.fn().mockResolvedValue("mock-jwt-token");
const mockJwtVerify = vi.fn();

vi.mock("jose", () => {
  class MockSignJWT {
    private payload: Record<string, unknown>;
    constructor(payload: Record<string, unknown>) {
      this.payload = payload;
    }
    setProtectedHeader() { return this; }
    setExpirationTime() { return this; }
    setIssuedAt() { return this; }
    sign() { return mockSign(this.payload); }
  }
  return {
    SignJWT: MockSignJWT,
    jwtVerify: (...args: unknown[]) => mockJwtVerify(...args),
  };
});

const { createSession, getSession, deleteSession, verifySession } =
  await import("@/lib/auth");

beforeEach(() => {
  vi.clearAllMocks();
  mockSign.mockResolvedValue("mock-jwt-token");
});

describe("createSession", () => {
  test("sets an httpOnly cookie with the signed token", async () => {
    await createSession("user-123", "test@example.com");

    expect(mockCookieStore.set).toHaveBeenCalledTimes(1);
    const [name, token, options] = mockCookieStore.set.mock.calls[0];

    expect(name).toBe(COOKIE_NAME);
    expect(token).toBe("mock-jwt-token");
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
  });

  test("sets cookie expiry to 7 days from now", async () => {
    const before = Date.now();
    await createSession("user-123", "test@example.com");
    const after = Date.now();

    const [, , options] = mockCookieStore.set.mock.calls[0];
    const expiryTime = options.expires.getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    expect(expiryTime).toBeGreaterThanOrEqual(before + sevenDaysMs);
    expect(expiryTime).toBeLessThanOrEqual(after + sevenDaysMs);
  });

  test("signs the JWT with userId and email in payload", async () => {
    await createSession("user-456", "hello@test.com");

    expect(mockSign).toHaveBeenCalledTimes(1);
    const payload = mockSign.mock.calls[0][0];
    expect(payload.userId).toBe("user-456");
    expect(payload.email).toBe("hello@test.com");
  });

  test("includes expiresAt in the JWT payload", async () => {
    const before = Date.now();
    await createSession("user-1", "a@b.com");

    const payload = mockSign.mock.calls[0][0];
    const expiresAt = new Date(payload.expiresAt).getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    expect(expiresAt).toBeGreaterThanOrEqual(before + sevenDaysMs);
  });
});

describe("getSession", () => {
  test("returns session payload for a valid token", async () => {
    mockCookieStore.get.mockReturnValue({ value: "valid-token" });
    mockJwtVerify.mockResolvedValue({
      payload: { userId: "user-1", email: "user@test.com" },
    });

    const session = await getSession();

    expect(session).not.toBeNull();
    expect(session!.userId).toBe("user-1");
    expect(session!.email).toBe("user@test.com");
    expect(mockCookieStore.get).toHaveBeenCalledWith(COOKIE_NAME);
  });

  test("returns null when no cookie exists", async () => {
    mockCookieStore.get.mockReturnValue(undefined);

    const session = await getSession();
    expect(session).toBeNull();
    expect(mockJwtVerify).not.toHaveBeenCalled();
  });

  test("returns null for an invalid token", async () => {
    mockCookieStore.get.mockReturnValue({ value: "bad-token" });
    mockJwtVerify.mockRejectedValue(new Error("invalid signature"));

    const session = await getSession();
    expect(session).toBeNull();
  });

  test("returns null for an expired token", async () => {
    mockCookieStore.get.mockReturnValue({ value: "expired-token" });
    mockJwtVerify.mockRejectedValue(new Error("jwt expired"));

    const session = await getSession();
    expect(session).toBeNull();
  });
});

describe("deleteSession", () => {
  test("deletes the auth cookie", async () => {
    await deleteSession();

    expect(mockCookieStore.delete).toHaveBeenCalledTimes(1);
    expect(mockCookieStore.delete).toHaveBeenCalledWith(COOKIE_NAME);
  });
});

describe("verifySession", () => {
  test("returns session payload for a valid token on request", async () => {
    mockJwtVerify.mockResolvedValue({
      payload: { userId: "user-2", email: "req@test.com" },
    });
    const request = {
      cookies: { get: vi.fn().mockReturnValue({ value: "valid-token" }) },
    } as any;

    const session = await verifySession(request);

    expect(session).not.toBeNull();
    expect(session!.userId).toBe("user-2");
    expect(session!.email).toBe("req@test.com");
    expect(request.cookies.get).toHaveBeenCalledWith(COOKIE_NAME);
  });

  test("returns null when request has no auth cookie", async () => {
    const request = {
      cookies: { get: vi.fn().mockReturnValue(undefined) },
    } as any;

    const session = await verifySession(request);
    expect(session).toBeNull();
    expect(mockJwtVerify).not.toHaveBeenCalled();
  });

  test("returns null for an invalid token on request", async () => {
    mockJwtVerify.mockRejectedValue(new Error("invalid signature"));
    const request = {
      cookies: { get: vi.fn().mockReturnValue({ value: "garbage" }) },
    } as any;

    const session = await verifySession(request);
    expect(session).toBeNull();
  });

  test("returns null for an expired token on request", async () => {
    mockJwtVerify.mockRejectedValue(new Error("jwt expired"));
    const request = {
      cookies: { get: vi.fn().mockReturnValue({ value: "expired" }) },
    } as any;

    const session = await verifySession(request);
    expect(session).toBeNull();
  });
});
