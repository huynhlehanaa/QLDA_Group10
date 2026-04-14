"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";

import { Avatar } from "../../../components/Avatar";
import { getMyProfile, updateMyAvatar, updateMyPhone } from "../../../lib/auth";

const VN_PHONE_PATTERN = /^(?:\+84|0)(?:3|5|7|8|9)\d{8}$/;

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const profile = await getMyProfile();
        if (!active) {
          return;
        }
        setFullName(profile.full_name);
        setEmail(profile.email);
        setPhone(profile.phone ?? "");
        setAvatar(profile.avatar_url ?? "");
      } catch {
        if (active) {
          setError("Không tải được hồ sơ.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  async function handleUpdatePhone(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!VN_PHONE_PATTERN.test(phone)) {
      setError("Số điện thoại không đúng định dạng Việt Nam.");
      return;
    }

    setSavingPhone(true);

    try {
      await updateMyPhone(phone);
      setError(null);
    } catch {
      setError("Cập nhật số điện thoại thất bại.");
    } finally {
      setSavingPhone(false);
    }
  }

  async function handleUpdateAvatar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingAvatar(true);
    try {
      await updateMyAvatar(avatar);
      setError(null);
    } catch (cause) {
      if (axios.isAxiosError(cause)) {
        setError("Cập nhật ảnh đại diện thất bại.");
        return;
      }
      setError("Cập nhật ảnh đại diện thất bại.");
    } finally {
      setSavingAvatar(false);
    }
  }

  if (loading) {
    return <section className="panel">Đang tải hồ sơ...</section>;
  }

  return (
    <section className="section-grid">
      <section className="panel profile-hero">
        <Avatar name={fullName || "Nhân viên"} src={avatar || null} size="lg" className="avatar-wrap" />
        <div className="profile-meta">
          <h2>{fullName}</h2>
          <p>{email}</p>
          <div className="badge-row">
            <span className="badge">Hồ sơ cá nhân</span>
            <span className="badge">Cập nhật được ảnh đại diện</span>
            <span className="badge">Tối ưu cho PWA</span>
          </div>
        </div>
      </section>

      <section className="panel stack">
        <div>
          <h1 className="title">Hồ sơ cá nhân</h1>
          <p className="muted">Cập nhật thông tin cơ bản của bạn.</p>
        </div>

        {error ? <p className="error">{error}</p> : null}

        <div className="split-layout">
          <div className="section-grid">
            <section className="section-card stack">
              <label>
                Họ và tên
                <input value={fullName} readOnly />
              </label>
              <label>
                Email
                <input value={email} readOnly />
              </label>
            </section>

            <section className="section-card stack">
              <form className="stack" onSubmit={handleUpdatePhone}>
                <label>
                  Số điện thoại
                  <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="0901234567" />
                </label>
                <p className="helper-text">Định dạng Việt Nam: 0xxxxxxxxx hoặc +84xxxxxxxxx.</p>
                <button type="submit" disabled={savingPhone}>
                  {savingPhone ? "Đang lưu..." : "Lưu số điện thoại"}
                </button>
              </form>
            </section>
          </div>

          <section className="section-card stack">
            <div>
              <h3 className="title" style={{ fontSize: "1.1rem", marginBottom: 4 }}>
                Ảnh đại diện
              </h3>
              <p className="helper-text">Dán đường dẫn ảnh để cập nhật ngay trên thẻ hồ sơ.</p>
            </div>

            <form className="stack" onSubmit={handleUpdateAvatar}>
              <Avatar
                name={fullName || "Nhân viên"}
                src={avatar || null}
                size="md"
                className="avatar-wrap"
                label="Xem trước ảnh đại diện của"
              />
              <label>
                URL ảnh đại diện
                <input value={avatar} onChange={(event) => setAvatar(event.target.value)} placeholder="https://..." />
              </label>
              <button type="submit" className="subtle-button" disabled={savingAvatar}>
                {savingAvatar ? "Đang lưu..." : "Lưu ảnh đại diện"}
              </button>
            </form>
          </section>
        </div>
      </section>
    </section>
  );
}
