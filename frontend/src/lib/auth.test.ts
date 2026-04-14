import { describe, expect, it, vi } from "vitest";

import { mapAuthErrorCode, validatePasswordStrength } from "./auth";

vi.mock("./api", () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

describe("auth utils", () => {
  it("validates password strength like backend rules", () => {
    expect(validatePasswordStrength("Weakpass")).toBe(false);
    expect(validatePasswordStrength("Valid@123")).toBe(true);
  });

  it("maps backend auth error codes to messages", () => {
    expect(mapAuthErrorCode("EMAIL_NOT_FOUND")).toContain("Email");
    expect(mapAuthErrorCode("WRONG_PASSWORD")).toContain("Mat khau");
    expect(mapAuthErrorCode("ACCOUNT_LOCKED")).toContain("khoa");
  });
});
