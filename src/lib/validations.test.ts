import { describe, expect, it } from "vitest";
import {
  loginSchema,
  registrationRequestSchema,
  registerSchema,
} from "./validations";

describe("authentication validation", () => {
  it("accepts registration without email and without a password length rule", () => {
    const result = registrationRequestSchema.parse({
      name: "  Archive User  ",
      username: "  New_User  ",
      password: "x",
    });

    expect(result).toEqual({
      name: "Archive User",
      username: "new_user",
      password: "x",
    });
  });

  it("normalizes email when registration includes one", () => {
    expect(
      registrationRequestSchema.parse({
        name: "Archive User",
        username: "new_user",
        email: "  USER@Example.COM ",
        password: "x",
      }).email,
    ).toBe("user@example.com");
  });

  it("keeps password confirmation as a client-side form requirement", () => {
    expect(
      registerSchema.safeParse({
        name: "Archive User",
        username: "archive-user",
        email: "user@example.com",
        password: "x",
        confirmPassword: "Different1",
      }).success,
    ).toBe(false);
  });

  it("accepts an email or username identifier with any non-empty password", () => {
    expect(
      loginSchema.parse({ identifier: " archive_user ", password: "x" }),
    ).toEqual({ identifier: "archive_user", password: "x" });
  });
});
