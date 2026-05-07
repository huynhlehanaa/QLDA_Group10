-- ============================================================
-- KPI Nội Bộ — Complete Schema (Sprint 1-4 ready)
-- Chạy: Get-Content .\KPI_complete.sql | docker exec -i backend-db-1 psql -U admin -d kpi_system
-- ============================================================

-- ===================
-- Sprint 1 Bảo mật, tài khoản, tổ chức
-- ===================

-- Reset sạch
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── ORGANIZATIONS ─────────────────────────────────────────────
CREATE TABLE "ORGANIZATIONS" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"        varchar(255) NOT NULL,
  "logo_url"    text,
  "work_days"   json DEFAULT '["mon","tue","wed","thu","fri"]',
  "work_start"  varchar(5) DEFAULT '08:00',
  "work_end"    varchar(5) DEFAULT '17:30',
  "created_at"  timestamptz DEFAULT now()
);

-- ── DEPARTMENTS ───────────────────────────────────────────────
CREATE TABLE "DEPARTMENTS" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id"      uuid NOT NULL,
  "manager_id"  uuid,
  "name"        varchar(255) NOT NULL,
  "description" varchar(500),
  "is_active"   boolean DEFAULT true,
  "created_at"  timestamptz DEFAULT now()
);

-- ── USERS ─────────────────────────────────────────────────────
CREATE TABLE "USERS" (
  "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id"              uuid,
  "dept_id"             uuid,
  "full_name"           varchar(255) NOT NULL,
  "email"               varchar(255) UNIQUE NOT NULL,
  "password_hash"       text NOT NULL,
  "role"                varchar(20) NOT NULL CHECK (role IN ('ceo','manager','staff')),
  "is_active"           boolean DEFAULT true,
  "must_change_pw"      boolean DEFAULT true,
  "failed_login_count"  int DEFAULT 0,
  "locked_until"        timestamptz,
  "avatar_url"          text,
  "phone"               varchar(20),
  "first_login_at"      timestamptz,
  "created_at"          timestamptz DEFAULT now()
);

-- ── NOTIFICATIONS ─────────────────────────────────────────────
CREATE TABLE "NOTIFICATIONS" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"    uuid NOT NULL,
  "type"       varchar(50),
  "title"      varchar(255),
  "body"       text,
  "is_read"    boolean DEFAULT false,
  "created_at" timestamptz DEFAULT now()
);

-- ── LOGIN_LOGS ────────────────────────────────────────────────
CREATE TABLE "LOGIN_LOGS" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"          uuid,
  "email_attempted"  varchar(255),
  "ip_address"       varchar(45),
  "user_agent"       text,
  "success"          boolean NOT NULL,
  "created_at"       timestamptz DEFAULT now()
);

-- ── FOREIGN KEYS ──────────────────────────────────────────────
ALTER TABLE "USERS" ADD FOREIGN KEY ("org_id") REFERENCES "ORGANIZATIONS" ("id");
ALTER TABLE "USERS" ADD FOREIGN KEY ("dept_id") REFERENCES "DEPARTMENTS" ("id");

ALTER TABLE "DEPARTMENTS" ADD FOREIGN KEY ("org_id") REFERENCES "ORGANIZATIONS" ("id");
ALTER TABLE "DEPARTMENTS" ADD FOREIGN KEY ("manager_id") REFERENCES "USERS" ("id") DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "NOTIFICATIONS" ADD FOREIGN KEY ("user_id") REFERENCES "USERS" ("id") ON DELETE CASCADE;

ALTER TABLE "LOGIN_LOGS" ADD FOREIGN KEY ("user_id") REFERENCES "USERS" ("id");

-- ── INDEXES ───────────────────────────────────────────────────
CREATE INDEX idx_users_email      ON "USERS"("email");
CREATE INDEX idx_users_org        ON "USERS"("org_id");
CREATE INDEX idx_users_dept       ON "USERS"("dept_id");
CREATE INDEX idx_users_role       ON "USERS"("role");
CREATE INDEX idx_notif_user_read  ON "NOTIFICATIONS"("user_id","is_read");
CREATE INDEX idx_login_user       ON "LOGIN_LOGS"("user_id");
CREATE INDEX idx_login_created    ON "LOGIN_LOGS"("created_at");

-- ========================================
-- Sprint 2 Migration — Task Management
-- ========================================

-- ── TASKS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "TASKS" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "dept_id"        uuid NOT NULL,
  "created_by"     uuid NOT NULL,
  "title"          varchar(500) NOT NULL,
  "description"    text,
  "status"         varchar(20) DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done')),
  "priority"       varchar(20) DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  "progress_pct"   int DEFAULT 0 CHECK (progress_pct >= 0 AND progress_pct <= 100),
  "deadline"       timestamptz,
  "is_recurring"   boolean DEFAULT false,
  "recur_pattern"  varchar(50),
  "epic_id"        uuid,
  "completed_at"   timestamptz,
  "created_at"     timestamptz DEFAULT now()
);

-- ── TASK_ASSIGNEES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "TASK_ASSIGNEES" (
  "task_id"  uuid NOT NULL,
  "user_id"  uuid NOT NULL,
  PRIMARY KEY ("task_id", "user_id")
);

-- ── TASK_COMMENTS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "TASK_COMMENTS" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "task_id"    uuid NOT NULL,
  "user_id"    uuid NOT NULL,
  "content"    text NOT NULL,
  "created_at" timestamptz DEFAULT now()
);

-- ── TASK_ATTACHMENTS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "TASK_ATTACHMENTS" (
  "id"        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "task_id"   uuid NOT NULL,
  "file_url"  text NOT NULL,
  "file_name" varchar(255),
  "file_size" int
);

-- ── TASK_CHECKLISTS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "TASK_CHECKLISTS" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "task_id"     uuid NOT NULL,
  "content"     varchar(500) NOT NULL,
  "is_done"     boolean DEFAULT false,
  "position"    int DEFAULT 0,
  "created_at"  timestamptz DEFAULT now()
);

-- ── EPICS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "EPICS" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "dept_id"    uuid NOT NULL,
  "name"       varchar(255) NOT NULL,
  "created_by" uuid NOT NULL,
  "created_at" timestamptz DEFAULT now()
);

-- ── FOREIGN KEYS (Sprint 2 Task-related) ──────────────────────
ALTER TABLE "TASKS" ADD FOREIGN KEY ("dept_id") REFERENCES "DEPARTMENTS" ("id");
ALTER TABLE "TASKS" ADD FOREIGN KEY ("created_by") REFERENCES "USERS" ("id");
ALTER TABLE "TASKS" ADD FOREIGN KEY ("epic_id") REFERENCES "EPICS" ("id");

ALTER TABLE "TASK_ASSIGNEES" ADD FOREIGN KEY ("task_id") REFERENCES "TASKS" ("id") ON DELETE CASCADE;
ALTER TABLE "TASK_ASSIGNEES" ADD FOREIGN KEY ("user_id") REFERENCES "USERS" ("id");

ALTER TABLE "TASK_COMMENTS" ADD FOREIGN KEY ("task_id") REFERENCES "TASKS" ("id") ON DELETE CASCADE;
ALTER TABLE "TASK_COMMENTS" ADD FOREIGN KEY ("user_id") REFERENCES "USERS" ("id");

ALTER TABLE "TASK_ATTACHMENTS" ADD FOREIGN KEY ("task_id") REFERENCES "TASKS" ("id") ON DELETE CASCADE;

ALTER TABLE "TASK_CHECKLISTS" ADD FOREIGN KEY ("task_id") REFERENCES "TASKS" ("id") ON DELETE CASCADE;

ALTER TABLE "EPICS" ADD FOREIGN KEY ("dept_id") REFERENCES "DEPARTMENTS" ("id");
ALTER TABLE "EPICS" ADD FOREIGN KEY ("created_by") REFERENCES "USERS" ("id");

-- ── INDEXES (Sprint 2 Task-related) ───────────────────────────
CREATE INDEX IF NOT EXISTS idx_tasks_dept       ON "TASKS"("dept_id");
CREATE INDEX IF NOT EXISTS idx_tasks_status     ON "TASKS"("status");
CREATE INDEX IF NOT EXISTS idx_tasks_deadline   ON "TASKS"("deadline");
CREATE INDEX IF NOT EXISTS idx_task_assign_user ON "TASK_ASSIGNEES"("user_id");


-- Bảng lịch sử thay đổi task
CREATE TABLE IF NOT EXISTS "TASK_HISTORY" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "task_id"     uuid NOT NULL,
  "changed_by"  uuid NOT NULL,
  "field"       varchar(50),
  "old_value"   text,
  "new_value"   text,
  "note"        text,
  "created_at"  timestamptz DEFAULT now()
);

ALTER TABLE "TASK_HISTORY"
  ADD FOREIGN KEY ("task_id") REFERENCES "TASKS" ("id") ON DELETE CASCADE,
  ADD FOREIGN KEY ("changed_by") REFERENCES "USERS" ("id");

-- Bảng yêu cầu gia hạn deadline
CREATE TABLE IF NOT EXISTS "DEADLINE_EXTENSION_REQUESTS" (
  "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "task_id"           uuid NOT NULL,
  "requested_by"      uuid NOT NULL,
  "proposed_deadline" timestamptz NOT NULL,
  "reason"            text NOT NULL,
  "status"            varchar(20) DEFAULT 'pending',
  "reviewed_by"       uuid,
  "review_note"       text,
  "created_at"        timestamptz DEFAULT now(),
  "reviewed_at"       timestamptz
);

ALTER TABLE "DEADLINE_EXTENSION_REQUESTS"
  ADD FOREIGN KEY ("task_id") REFERENCES "TASKS" ("id") ON DELETE CASCADE,
  ADD FOREIGN KEY ("requested_by") REFERENCES "USERS" ("id"),
  ADD FOREIGN KEY ("reviewed_by") REFERENCES "USERS" ("id");

-- Thêm cột còn thiếu vào TASKS
ALTER TABLE "TASKS"
  ADD COLUMN IF NOT EXISTS "blocked_by_id" uuid REFERENCES "TASKS"("id"),
  ADD COLUMN IF NOT EXISTS "cancel_reason" text,
  ADD COLUMN IF NOT EXISTS "cancelled_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "last_updated_at" timestamptz DEFAULT now();

-- Thêm cột uploaded_by vào TASK_ATTACHMENTS
ALTER TABLE "TASK_ATTACHMENTS"
  ADD COLUMN IF NOT EXISTS "uploaded_by" uuid REFERENCES "USERS"("id");

-- Thêm cột parent_id vào TASK_COMMENTS (reply)
ALTER TABLE "TASK_COMMENTS"
  ADD COLUMN IF NOT EXISTS "parent_id" uuid REFERENCES "TASK_COMMENTS"("id");

-- Indexes Sprint 2
CREATE INDEX IF NOT EXISTS idx_tasks_last_updated ON "TASKS"("last_updated_at");
CREATE INDEX IF NOT EXISTS idx_tasks_epic         ON "TASKS"("epic_id");
CREATE INDEX IF NOT EXISTS idx_task_history_task  ON "TASK_HISTORY"("task_id");
CREATE INDEX IF NOT EXISTS idx_ext_req_task       ON "DEADLINE_EXTENSION_REQUESTS"("task_id");


-- =====================================
-- Sprint 3 Migration — KPI & Đánh giá
-- =====================================

CREATE TABLE IF NOT EXISTS "KPI_CONFIG" (
  "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id"              uuid NOT NULL REFERENCES "ORGANIZATIONS"("id"),
  "target_score"        float DEFAULT 75.0,
  "cycle_day"           int DEFAULT 1 CHECK (cycle_day >= 1 AND cycle_day <= 31),
  "threshold_excellent" float DEFAULT 90.0,
  "threshold_good"      float DEFAULT 75.0,
  "threshold_pass"      float DEFAULT 60.0,
  "updated_at"          timestamptz DEFAULT now(),
  "updated_by"          uuid REFERENCES "USERS"("id"),
  UNIQUE ("org_id")
);

CREATE TABLE IF NOT EXISTS "KPI_CRITERIA" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id"         uuid NOT NULL REFERENCES "ORGANIZATIONS"("id"),
  "dept_id"        uuid REFERENCES "DEPARTMENTS"("id"),
  "name"           varchar(255) NOT NULL,
  "description"    text,
  "weight"         float NOT NULL CHECK (weight > 0 AND weight <= 100),
  "default_weight" float,
  "is_global"      boolean DEFAULT false,
  "formula_type"   varchar(50) DEFAULT 'manual',
  "is_active"      boolean DEFAULT true,
  "created_at"     timestamptz DEFAULT now(),
  "created_by"     uuid REFERENCES "USERS"("id")
);

-- ── KPI_SCORES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "KPI_SCORES" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"        uuid NOT NULL,
  "criteria_id"    uuid NOT NULL,
  "year"           int NOT NULL,
  "month"          int NOT NULL CHECK (month >= 1 AND month <= 12),
  "score"          float DEFAULT 0,
  "weighted_score" float DEFAULT 0,
  "is_finalized"   boolean DEFAULT false,
  "updated_at"     timestamptz DEFAULT now(),
  "created_at"     timestamptz DEFAULT now(),
  UNIQUE ("user_id", "criteria_id", "year", "month")
);

CREATE TABLE IF NOT EXISTS "KPI_CRITERIA_HISTORY" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "criteria_id" uuid NOT NULL REFERENCES "KPI_CRITERIA"("id") ON DELETE CASCADE,
  "changed_by"  uuid NOT NULL REFERENCES "USERS"("id"),
  "old_weight"  float,
  "new_weight"  float,
  "old_name"    varchar(255),
  "new_name"    varchar(255),
  "note"        text,
  "changed_at"  timestamptz DEFAULT now()
);

-- Foreign keys cho KPI_SCORES
ALTER TABLE "KPI_SCORES" ADD FOREIGN KEY ("user_id") REFERENCES "USERS" ("id");
ALTER TABLE "KPI_SCORES" ADD FOREIGN KEY ("criteria_id") REFERENCES "KPI_CRITERIA" ("id");

CREATE TABLE IF NOT EXISTS "KPI_TARGETS" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"      uuid NOT NULL REFERENCES "USERS"("id"),
  "year"         int NOT NULL,
  "month"        int NOT NULL CHECK (month >= 1 AND month <= 12),
  "target_score" float NOT NULL CHECK (target_score >= 0 AND target_score <= 100),
  "created_at"   timestamptz DEFAULT now(),
  UNIQUE ("user_id", "year", "month")
);

CREATE TABLE IF NOT EXISTS "KPI_FINALIZE" (
  "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id"        uuid NOT NULL REFERENCES "ORGANIZATIONS"("id"),
  "year"          int NOT NULL,
  "month"         int NOT NULL CHECK (month >= 1 AND month <= 12),
  "is_finalized"  boolean DEFAULT false,
  "finalized_by"  uuid REFERENCES "USERS"("id"),
  "finalized_at"  timestamptz,
  "unlock_reason" text,
  "unlocked_by"   uuid REFERENCES "USERS"("id"),
  "unlocked_at"   timestamptz,
  UNIQUE ("org_id", "year", "month")
);

CREATE TABLE IF NOT EXISTS "KPI_APPEALS" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"        uuid NOT NULL REFERENCES "USERS"("id"),
  "year"           int NOT NULL,
  "month"          int NOT NULL,
  "criteria_name"  varchar(255) NOT NULL,
  "current_score"  float NOT NULL,
  "proposed_score" float NOT NULL,
  "reason"         text NOT NULL,
  "status"         varchar(20) DEFAULT 'pending',
  "response"       text,
  "adjusted_score" float,
  "responded_by"   uuid REFERENCES "USERS"("id"),
  "responded_at"   timestamptz,
  "created_at"     timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "KPI_ADJUSTMENTS" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"        uuid NOT NULL REFERENCES "USERS"("id"),
  "requested_by"   uuid NOT NULL REFERENCES "USERS"("id"),
  "year"           int NOT NULL,
  "month"          int NOT NULL,
  "criteria_name"  varchar(255) NOT NULL,
  "original_score" float,
  "proposed_score" float NOT NULL,
  "reason"         text NOT NULL,
  "status"         varchar(20) DEFAULT 'pending',
  "comment"        text,
  "reviewed_by"    uuid REFERENCES "USERS"("id"),
  "reviewed_at"    timestamptz,
  "created_at"     timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kpi_criteria_org    ON "KPI_CRITERIA"("org_id");
CREATE INDEX IF NOT EXISTS idx_kpi_criteria_dept   ON "KPI_CRITERIA"("dept_id");
CREATE INDEX IF NOT EXISTS idx_kpi_scores_user     ON "KPI_SCORES"("user_id", "year", "month");
CREATE INDEX IF NOT EXISTS idx_kpi_scores_criteria ON "KPI_SCORES"("criteria_id");
CREATE INDEX IF NOT EXISTS idx_kpi_appeals_user    ON "KPI_APPEALS"("user_id");
CREATE INDEX IF NOT EXISTS idx_kpi_adj_user        ON "KPI_ADJUSTMENTS"("user_id");

SELECT 'KPI_complete created successfully!' AS result;