import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProfilePage from "./page";

const getMyProfileMock = vi.fn();
const updateMyPhoneMock = vi.fn();
const updateMyAvatarMock = vi.fn();

vi.mock("../../../lib/auth", () => ({
  getMyProfile: (...args: unknown[]) => getMyProfileMock(...args),
  updateMyPhone: (...args: unknown[]) => updateMyPhoneMock(...args),
  updateMyAvatar: (...args: unknown[]) => updateMyAvatarMock(...args),
}));

describe("ProfilePage", () => {
  beforeEach(() => {
    getMyProfileMock.mockReset();
    updateMyPhoneMock.mockReset();
    updateMyAvatarMock.mockReset();

    getMyProfileMock.mockResolvedValue({
      id: "user-1",
      full_name: "Staff User",
      email: "staff@test.com",
      role: "staff",
      is_active: true,
      must_change_pw: false,
      avatar_url: "https://cdn.example.com/old-avatar.png",
      phone: "0901234567",
      created_at: "2026-04-13T00:00:00Z",
    });
  });

  it("loads and renders profile info from API", async () => {
    render(<ProfilePage />);

    expect(screen.getByText("Đang tải hồ sơ...")).toBeInTheDocument();

    expect(await screen.findByDisplayValue("Staff User")).toBeInTheDocument();
    expect(screen.getByDisplayValue("staff@test.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("0901234567")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://cdn.example.com/old-avatar.png")).toBeInTheDocument();
    expect(screen.getByAltText("Ảnh đại diện của Staff User")).toBeInTheDocument();
  });

  it("shows error when profile loading fails", async () => {
    getMyProfileMock.mockRejectedValueOnce(new Error("network error"));

    render(<ProfilePage />);

    expect(await screen.findByText("Không tải được hồ sơ.")).toBeInTheDocument();
  });

  it("blocks invalid VN phone format and does not call update API", async () => {
    render(<ProfilePage />);

    await screen.findByDisplayValue("Staff User");

    const phoneInput = screen.getByPlaceholderText("0901234567");
    await userEvent.clear(phoneInput);
    await userEvent.type(phoneInput, "0112345678");
    await userEvent.click(screen.getByRole("button", { name: "Lưu số điện thoại" }));

    expect(updateMyPhoneMock).not.toHaveBeenCalled();
    expect(await screen.findByText("Số điện thoại không đúng định dạng Việt Nam.")).toBeInTheDocument();
  });

  it("updates phone successfully with valid VN format", async () => {
    updateMyPhoneMock.mockResolvedValueOnce("+84901234567");

    render(<ProfilePage />);

    await screen.findByDisplayValue("Staff User");

    const phoneInput = screen.getByPlaceholderText("0901234567");
    await userEvent.clear(phoneInput);
    await userEvent.type(phoneInput, "+84901234567");
    await userEvent.click(screen.getByRole("button", { name: "Lưu số điện thoại" }));

    await waitFor(() => {
      expect(updateMyPhoneMock).toHaveBeenCalledWith("+84901234567");
    });
    expect(screen.queryByText("Cap nhat so dien thoai that bai.")).not.toBeInTheDocument();
  });

  it("shows phone update error when API rejects", async () => {
    updateMyPhoneMock.mockRejectedValueOnce(new Error("bad request"));

    render(<ProfilePage />);

    await screen.findByDisplayValue("Staff User");

    const phoneInput = screen.getByPlaceholderText("0901234567");
    await userEvent.clear(phoneInput);
    await userEvent.type(phoneInput, "0909876543");
    await userEvent.click(screen.getByRole("button", { name: "Lưu số điện thoại" }));

    expect(await screen.findByText("Cập nhật số điện thoại thất bại.")).toBeInTheDocument();
  });

  it("updates avatar successfully", async () => {
    updateMyAvatarMock.mockResolvedValueOnce("https://cdn.example.com/new-avatar.png");

    render(<ProfilePage />);

    await screen.findByDisplayValue("Staff User");

    const avatarInput = screen.getByPlaceholderText("https://...");
    await userEvent.clear(avatarInput);
    await userEvent.type(avatarInput, "https://cdn.example.com/new-avatar.png");
    await userEvent.click(screen.getByRole("button", { name: "Lưu ảnh đại diện" }));

    await waitFor(() => {
      expect(updateMyAvatarMock).toHaveBeenCalledWith("https://cdn.example.com/new-avatar.png");
    });
    expect(screen.queryByText("Cập nhật ảnh đại diện thất bại.")).not.toBeInTheDocument();
  });

  it("shows avatar update error when API rejects", async () => {
    updateMyAvatarMock.mockRejectedValueOnce(new Error("network error"));

    render(<ProfilePage />);

    await screen.findByDisplayValue("Staff User");

    const avatarInput = screen.getByPlaceholderText("https://...");
    await userEvent.clear(avatarInput);
    await userEvent.type(avatarInput, "https://cdn.example.com/new-avatar.png");
    await userEvent.click(screen.getByRole("button", { name: "Lưu ảnh đại diện" }));

    expect(await screen.findByText("Cập nhật ảnh đại diện thất bại.")).toBeInTheDocument();
  });
});
