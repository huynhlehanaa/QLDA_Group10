# Frontend - KPI Noi Bo (Sprint 1 Employee Scope)

Frontend duoc khoi tao bang React + Vite + TypeScript, su dung TailwindCSS.

## Scope da implement

- PB001, PB002: Dang nhap email/password + hien thi loi theo backend
- PB004: Canh bao truoc het phien 5 phut + gia han phien
- PB005, PB006: Dang xuat thiet bi hien tai va dang xuat tat ca
- PB007, PB008, PB009: Quen/reset/doi mat khau
- PB011: Man hinh OTP send/verify
- PB018, PB019, PB020, PB021: Role guard staff, role redirect, header user, welcome onboarding block
- PB043, PB044, PB045: Xem/cap nhat profile (avatar, phone)

## Chay local

1. Cai dependency

```bash
npm install
```

2. Chay dev server (mac dinh port 3000)

```bash
npm run dev
```

3. Build production

```bash
npm run build
```

## Bien moi truong

Co the tao file .env trong thu muc frontend:

```env
VITE_API_URL=http://localhost:8000/api/v1
```

Neu khong khai bao, app se dung gia tri mac dinh tren.
