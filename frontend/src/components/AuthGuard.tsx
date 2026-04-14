"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "../hooks/useAuth";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, mustChangePassword } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }

    if (mustChangePassword && pathname !== "/auth/change-password") {
      router.replace("/auth/change-password");
    }
  }, [isAuthenticated, mustChangePassword, pathname, router]);

  if (!isAuthenticated) {
    return null;
  }

  if (mustChangePassword && pathname !== "/auth/change-password") {
    return null;
  }

  return <>{children}</>;
}
