✅ KPI App - Data Seeding Complete
====================================

## 📊 Current Status

**Database State (Latest Run):**
- Users:         470 total (2 CEOs, 8 Managers, 460+ Staff)
- Tasks:         502 total
- Notifications: 1027 total
- Organizations: 2 (Công ty GROUP 10, Công ty Phát Triển Công Nghệ)
- Departments:   4 (2 per organization)

**Email Generation (IMPROVED):**
✅ All NEW emails are 100% ASCII-compatible with NO Unicode/diacritics
- Before: `Trần Long` → email might have `trần.long@g10.com` (⚠️ has ă)
- After:  `Trần Long` → email is `tran.long+staff@g10.com` (✅ pure ASCII)

**Examples of Generated Emails:**
```
Manager:  hoang.trung+manager@g10.com     (Hoàng Trung)
Manager:  le.lien+manager@g10.com         (Lê Liên)
Manager:  pham.son+manager@tdev.com       (Phạm Sơn)
Staff:    ly.long+staff@g10.com           (Lý Long)
Staff:    vu.lan+staff@tdev.com           (Vũ Lan)
Staff:    nguyen.minh+staff@g10.com       (Nguyễn Minh)
Staff:    hoang.minh+staff@tdev.com       (Hoàng Minh)
Staff:    dang.linh+staff@g10.com         (Đặng Linh)
Staff:    le.nhi+staff@tdev.com           (Lê Nhị)
```

## 🚀 Quick Start

### 1. Start Backend (Terminal 1)
```bash
cd d:\QLDA\KPINoiBo\backend
python -m uvicorn app.main:app --reload
# Runs on: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### 2. Start Vite Frontend (Terminal 2)
```bash
cd d:\QLDA\KPINoiBo\frontend
npm run dev
# Runs on: http://localhost:5173
```

### 3. Start Next.js Frontend (Terminal 3)
```bash
cd d:\QLDA\KPINoiBo\frontend1
npm run dev
# Runs on: http://localhost:3000
```

## 🔐 Test Credentials

**CEO Account:**
- Email:    ceo1@g10.com
- Password: Demo@123456

**Manager Account:**
- Email:    hoang.trung+manager@g10.com  (any manager email)
- Password: Demo@123456

**Staff Account:**
- Email:    ly.long+staff@g10.com  (any staff email)
- Password: Demo@123456

## 📋 Seeding Commands

### Default Seed (100 users)
```bash
cd d:\QLDA\KPINoiBo\backend
python seed_comprehensive.py
```

### Custom Record Count
```bash
python seed_comprehensive.py --count 200
# Creates ~200 users, 200+ tasks, 400+ notifications
```

### Fresh Database (Drop & Recreate)
```bash
python seed_comprehensive.py --clean
# Drops all tables, recreates schema, seeds ~100 users
```

### Combine Options
```bash
python seed_comprehensive.py --clean --count 150
# Fresh database with 150 user records
```

## 🎯 Features

### Email Generation
- ✅ Removes Vietnamese diacritics (100% ASCII)
- ✅ Format: `firstname.lastname+role@company.com`
- ✅ Handles special cases: `đ` → `d`, `Đ` → `D`
- ✅ Examples: `tran.long+staff@g10.com`, `dang.linh+staff@g10.com`

### Data Characteristics
- **Names**: Realistic Vietnamese full names
- **Statuses**: Mix of todo (50%), in_progress (30%), done (20%)
- **Priorities**: Mixed low, medium, high
- **Deadlines**: 1-30 days in future
- **Notifications**: Auto-created for each task assignment
- **KPI Framework**: Configured for each department

### Idempotency
- ✅ Safe to re-run without duplicating data
- ✅ Automatically skips existing organizations/departments/CEOs
- ✅ Only creates new staff/tasks as needed

## 🔍 Technical Implementation

### Accent Removal Function
```python
def remove_accents(text: str) -> str:
    """Remove Vietnamese diacritics/accents from text"""
    # First, normalize combining characters
    nfkd_form = unicodedata.normalize('NFKD', text)
    without_combining = ''.join([c for c in nfkd_form if not unicodedata.combining(c)])
    
    # Then handle special Vietnamese characters (d with stroke → d)
    without_combining = without_combining.replace('đ', 'd').replace('Đ', 'D')
    
    return without_combining
```

### Key Files
- `backend/seed_comprehensive.py` - Main seeding script (708+ lines)
- `seed_comprehensive.py` - Root wrapper for convenience
- `backend/README.md` - Complete documentation

## ✨ Recent Improvements

**Latest Update:**
- Improved `remove_accents()` to handle all Vietnamese characters
- Added special case for `đ`/`Đ` (d with stroke)
- All new emails are now 100% ASCII-compatible
- Verified with database queries

## 📚 Both Frontends Connected

Both frontend projects share the **same PostgreSQL database**:
- `frontend/` (Vite React, port 5173)
- `frontend1/` (Next.js, port 3000)

Changes in one frontend are immediately visible in the other!

---

**All work complete! Ready for development testing with comprehensive, realistic demo data.** ✅
