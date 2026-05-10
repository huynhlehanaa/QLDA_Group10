-- ============================================================
-- Sprint 3 PWA Migration — Mobile & PWA
-- ============================================================

CREATE TABLE IF NOT EXISTS "PUSH_SUBSCRIPTIONS" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"    uuid NOT NULL REFERENCES "USERS"("id"),
  "endpoint"   text NOT NULL UNIQUE,
  "p256dh_key" text NOT NULL,
  "auth_key"   text NOT NULL,
  "platform"   varchar(20) DEFAULT 'android',
  "is_active"  boolean DEFAULT true,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "NOTIFICATION_PREFERENCES" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"      uuid NOT NULL REFERENCES "USERS"("id") UNIQUE,
  "push_enabled" boolean DEFAULT true,
  "types"        json DEFAULT '{"new_task":true,"deadline":true,"kpi":true,"system":true}',
  "created_at"   timestamptz DEFAULT now(),
  "updated_at"   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_sub_user ON "PUSH_SUBSCRIPTIONS"("user_id");

SELECT 'Sprint 3 PWA migration completed!' AS result;
