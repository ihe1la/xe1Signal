import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => {
  const transaction = {
    user: { create: vi.fn() },
    frequency: { createMany: vi.fn() },
    userSettings: { create: vi.fn() },
  };

  return {
    transaction,
    db: {
      user: { findFirst: vi.fn() },
      $transaction: vi.fn((callback: (value: typeof transaction) => unknown) =>
        callback(transaction),
      ),
    },
    hash: vi.fn(),
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    user: mocks.db.user,
    get $transaction() {
      return mocks.db.$transaction;
    },
  },
}));

vi.mock("bcryptjs", () => ({
  default: { hash: mocks.hash },
}));

import { POST } from "./route";

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.db.user.findFirst.mockResolvedValue(null);
    mocks.hash.mockResolvedValue("password-hash");
    mocks.transaction.user.create.mockResolvedValue({
      id: "user-1",
      name: "Archive User",
      username: "archive_user",
      email: null,
    });
  });

  it("creates an account without email, confirmation, or a password length requirement", async () => {
    const request = new NextRequest("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "  Archive User  ",
        username: "  Archive_User  ",
        password: "x",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(mocks.transaction.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Archive User",
        username: "archive_user",
        email: undefined,
        passwordHash: "password-hash",
      }),
    });
    await expect(response.json()).resolves.toMatchObject({
      user: { id: "user-1", username: "archive_user" },
    });
  });

  it("does not limit registration by the number of existing accounts", async () => {
    const request = new NextRequest("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Another User",
        username: "another_user",
        password: "x",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(mocks.db.user).not.toHaveProperty("count");
  });
});
