"use client";

import { useAuthStore } from "../store/authStore";

export function useAuth() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const fullName = useAuthStore((state) => state.fullName);
  const role = useAuthStore((state) => state.role);
  const avatarUrl = useAuthStore((state) => state.avatarUrl);
  const mustChangePassword = useAuthStore((state) => state.mustChangePassword);
  const clearSession = useAuthStore((state) => state.clearSession);

  return {
    accessToken,
    fullName,
    role,
    avatarUrl,
    mustChangePassword,
    clearSession,
    isAuthenticated: Boolean(accessToken),
  };
}
