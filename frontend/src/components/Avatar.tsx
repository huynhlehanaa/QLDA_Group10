"use client";

import React from "react";

type AvatarSize = "sm" | "md" | "lg";

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: AvatarSize;
  className?: string;
  label?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "NV";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function Avatar({ name, src, size = "md", className, label }: AvatarProps) {
  const initials = getInitials(name);
  const hasImage = Boolean(src?.trim());
  const sizeClass = `avatar avatar--${size}`;
  const accessibilityLabel = `${label ?? "Ảnh đại diện của"} ${name}`;

  return (
    <div className={[sizeClass, className].filter(Boolean).join(" ")} aria-label={accessibilityLabel}>
      {hasImage ? (
        <img className="avatar__image" src={src ?? undefined} alt={accessibilityLabel} />
      ) : (
        <span className="avatar__fallback" aria-hidden="true">
          {initials}
        </span>
      )}
    </div>
  );
}