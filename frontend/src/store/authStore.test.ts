import { beforeEach, describe, expect, it } from "vitest";

import { useAuthStore } from "./authStore";

describe("authStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().clearSession();
  });

  it("stores session after login", () => {
    useAuthStore.getState().setSession({
      accessToken: "access-1",
      refreshToken: "refresh-1",
      role: "staff",
      userId: "user-1",
      fullName: "Staff A",
      avatarUrl: null,
      mustChangePassword: true,
    });

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe("access-1");
    expect(state.refreshToken).toBe("refresh-1");
    expect(state.role).toBe("staff");
    expect(state.mustChangePassword).toBe(true);
  });

  it("clears session state on logout", () => {
    useAuthStore.getState().setSession({
      accessToken: "access-1",
      refreshToken: "refresh-1",
      role: "staff",
      userId: "user-1",
      fullName: "Staff A",
      avatarUrl: null,
      mustChangePassword: true,
    });

    useAuthStore.getState().clearSession();

    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.role).toBeNull();
    expect(state.mustChangePassword).toBe(false);
  });
});
