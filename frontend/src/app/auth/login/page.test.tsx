import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import LoginPage from "./page";

const pushMock = vi.fn();
const loginMock = vi.fn();
const mapAuthErrorCodeMock = vi.fn<(code?: string) => string>((code?: string) => code ?? "error");

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock("../../../lib/auth", () => ({
  login: (...args: unknown[]) => loginMock(...args),
  mapAuthErrorCode: (code?: string) => mapAuthErrorCodeMock(code),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    pushMock.mockReset();
    loginMock.mockReset();
    mapAuthErrorCodeMock.mockClear();
  });

  it("redirects to profile when must_change_pw is false", async () => {
    loginMock.mockResolvedValueOnce({ must_change_pw: false });

    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText("Email công ty"), "staff@test.com");
    await userEvent.type(screen.getByLabelText("Mật khẩu"), "Valid@123");
    await userEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));

    expect(loginMock).toHaveBeenCalledWith("staff@test.com", "Valid@123");
    expect(pushMock).toHaveBeenCalledWith("/employee/profile");
  });

  it("redirects to change-password when must_change_pw is true", async () => {
    loginMock.mockResolvedValueOnce({ must_change_pw: true });

    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText("Email công ty"), "staff@test.com");
    await userEvent.type(screen.getByLabelText("Mật khẩu"), "Valid@123");
    await userEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));

    expect(pushMock).toHaveBeenCalledWith("/auth/change-password");
  });

  it("shows mapped message on API error", async () => {
    mapAuthErrorCodeMock.mockReturnValueOnce("Sai thong tin dang nhap");
    loginMock.mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { detail: { code: "WRONG_PASSWORD" } } },
    });

    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText("Email công ty"), "staff@test.com");
    await userEvent.type(screen.getByLabelText("Mật khẩu"), "Invalid@123");
    await userEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));

    expect(await screen.findByText("Sai thong tin dang nhap")).toBeInTheDocument();
  });
});
