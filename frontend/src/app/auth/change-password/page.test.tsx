import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ChangePasswordPage from "./page";

const replaceMock = vi.fn();
const pushMock = vi.fn();
const useAuthMock = vi.fn();
const changePasswordMock = vi.fn();
const validatePasswordStrengthMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
    push: pushMock,
  }),
}));

vi.mock("../../../hooks/useAuth", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("../../../lib/auth", () => ({
  changePassword: (...args: unknown[]) => changePasswordMock(...args),
  validatePasswordStrength: (...args: unknown[]) => validatePasswordStrengthMock(...args),
}));

describe("ChangePasswordPage", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    pushMock.mockReset();
    useAuthMock.mockReset();
    changePasswordMock.mockReset();
    validatePasswordStrengthMock.mockReset();

    validatePasswordStrengthMock.mockReturnValue(true);
  });

  it("redirects to login when user is unauthenticated", async () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: false,
      mustChangePassword: true,
    });

    render(<ChangePasswordPage />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/auth/login");
    });
  });

  it("redirects to profile when password change is not required", async () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      mustChangePassword: false,
    });

    render(<ChangePasswordPage />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/employee/profile");
    });
  });

  it("blocks submit when new password is weak", async () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      mustChangePassword: true,
    });
    validatePasswordStrengthMock.mockReturnValue(false);

    render(<ChangePasswordPage />);

    await userEvent.type(screen.getByLabelText("Mật khẩu hiện tại"), "Old@12345");
    await userEvent.type(screen.getByLabelText("Mật khẩu mới"), "weakpass");
    await userEvent.click(screen.getByRole("button", { name: "Xác nhận đổi mật khẩu" }));

    expect(changePasswordMock).not.toHaveBeenCalled();
    expect(await screen.findByText("Mật khẩu mới chưa đạt độ mạnh tối thiểu.")).toBeInTheDocument();
  });

  it("submits successfully and redirects to login", async () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      mustChangePassword: true,
    });
    changePasswordMock.mockResolvedValue(undefined);

    render(<ChangePasswordPage />);

    await userEvent.type(screen.getByLabelText("Mật khẩu hiện tại"), "Old@12345");
    await userEvent.type(screen.getByLabelText("Mật khẩu mới"), "NewStrong@123");
    await userEvent.click(screen.getByRole("button", { name: "Xác nhận đổi mật khẩu" }));

    await waitFor(() => {
      expect(changePasswordMock).toHaveBeenCalledWith("Old@12345", "NewStrong@123");
      expect(pushMock).toHaveBeenCalledWith("/auth/login");
    });
  });

  it("shows backend detail when API call fails", async () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      mustChangePassword: true,
    });
    changePasswordMock.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          detail: "Mat khau hien tai khong dung.",
        },
      },
    });

    render(<ChangePasswordPage />);

    await userEvent.type(screen.getByLabelText("Mật khẩu hiện tại"), "Wrong@123");
    await userEvent.type(screen.getByLabelText("Mật khẩu mới"), "NewStrong@123");
    await userEvent.click(screen.getByRole("button", { name: "Xác nhận đổi mật khẩu" }));

    expect(await screen.findByText("Mat khau hien tai khong dung.")).toBeInTheDocument();
  });
});
