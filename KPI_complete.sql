-- ============================================================
-- KPI Nội Bộ — Complete Schema (Sprint 1-4 ready)
-- Chạy: Get-Content .\KPI_complete.sql | docker exec -i backend-db-1 psql -U admin -d kpi_system
-- ============================================================

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

-- ── TASKS ─────────────────────────────────────────────────────
CREATE TABLE "TASKS" (
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
CREATE TABLE "TASK_ASSIGNEES" (
  "task_id"  uuid NOT NULL,
  "user_id"  uuid NOT NULL,
  PRIMARY KEY ("task_id", "user_id")
);

-- ── TASK_COMMENTS ─────────────────────────────────────────────
CREATE TABLE "TASK_COMMENTS" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "task_id"    uuid NOT NULL,
  "user_id"    uuid NOT NULL,
  "content"    text NOT NULL,
  "created_at" timestamptz DEFAULT now()
);

-- ── TASK_ATTACHMENTS ──────────────────────────────────────────
CREATE TABLE "TASK_ATTACHMENTS" (
  "id"        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "task_id"   uuid NOT NULL,
  "file_url"  text NOT NULL,
  "file_name" varchar(255),
  "file_size" int
);

-- ── TASK_CHECKLISTS ───────────────────────────────────────────
CREATE TABLE "TASK_CHECKLISTS" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "task_id"     uuid NOT NULL,
  "content"     varchar(500) NOT NULL,
  "is_done"     boolean DEFAULT false,
  "position"    int DEFAULT 0,
  "created_at"  timestamptz DEFAULT now()
);

-- ── EPICS ─────────────────────────────────────────────────────
CREATE TABLE "EPICS" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "dept_id"    uuid NOT NULL,
  "name"       varchar(255) NOT NULL,
  "created_by" uuid NOT NULL,
  "created_at" timestamptz DEFAULT now()
);

-- ── KPI_CRITERIA ──────────────────────────────────────────────
CREATE TABLE "KPI_CRITERIA" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id"      uuid NOT NULL,
  "dept_id"     uuid,
  "name"        varchar(255) NOT NULL,
  "description" text,
  "weight"      float NOT NULL CHECK (weight >= 0 AND weight <= 100),
  "is_global"   boolean DEFAULT false,
  "created_at"  timestamptz DEFAULT now()
);

-- ── KPI_SCORES ────────────────────────────────────────────────
CREATE TABLE "KPI_SCORES" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"        uuid NOT NULL,
  "criteria_id"    uuid NOT NULL,
  "year"           int NOT NULL,
  "month"          int NOT NULL CHECK (month >= 1 AND month <= 12),
  "score"          float DEFAULT 0,
  "weighted_score" float DEFAULT 0,
  "is_finalized"   boolean DEFAULT false,
  "created_at"     timestamptz DEFAULT now(),
  UNIQUE ("user_id", "criteria_id", "year", "month")
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

ALTER TABLE "KPI_CRITERIA" ADD FOREIGN KEY ("org_id") REFERENCES "ORGANIZATIONS" ("id");
ALTER TABLE "KPI_CRITERIA" ADD FOREIGN KEY ("dept_id") REFERENCES "DEPARTMENTS" ("id");

ALTER TABLE "KPI_SCORES" ADD FOREIGN KEY ("user_id") REFERENCES "USERS" ("id");
ALTER TABLE "KPI_SCORES" ADD FOREIGN KEY ("criteria_id") REFERENCES "KPI_CRITERIA" ("id");

ALTER TABLE "NOTIFICATIONS" ADD FOREIGN KEY ("user_id") REFERENCES "USERS" ("id") ON DELETE CASCADE;

ALTER TABLE "LOGIN_LOGS" ADD FOREIGN KEY ("user_id") REFERENCES "USERS" ("id");

-- ── INDEXES ───────────────────────────────────────────────────
CREATE INDEX idx_users_email      ON "USERS"("email");
CREATE INDEX idx_users_org        ON "USERS"("org_id");
CREATE INDEX idx_users_dept       ON "USERS"("dept_id");
CREATE INDEX idx_users_role       ON "USERS"("role");
CREATE INDEX idx_tasks_dept       ON "TASKS"("dept_id");
CREATE INDEX idx_tasks_status     ON "TASKS"("status");
CREATE INDEX idx_tasks_deadline   ON "TASKS"("deadline");
CREATE INDEX idx_task_assign_user ON "TASK_ASSIGNEES"("user_id");
CREATE INDEX idx_kpi_user_month   ON "KPI_SCORES"("user_id","year","month");
CREATE INDEX idx_notif_user_read  ON "NOTIFICATIONS"("user_id","is_read");
CREATE INDEX idx_login_user       ON "LOGIN_LOGS"("user_id");
CREATE INDEX idx_login_created    ON "LOGIN_LOGS"("created_at");

SELECT 'Schema KPI_complete created successfully!' AS result;
