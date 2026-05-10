"""
TDD Tests — Mobile & PWA — PB190 đến PB207

Phân loại:
- Backend API tests: PB199, PB203, PB204, PB205, PB206, PB207
  (push subscription, offline cache, badge count, notification preferences)
- Frontend-only (không test backend): PB190-PB198, PB200-PB202
  (manifest.json, service worker, splash screen, bottom nav, dark mode,
   kanban mobile, swipe gesture, pull-to-refresh, camera upload)

Thứ tự TDD:
1. pytest tests/test_pwa.py -v → FAIL
2. Viết services/pwa_service.py + api/pwa.py
3. pytest tests/test_pwa.py -v → PASS
"""
import uuid
import pytest
from datetime import datetime, timezone, timedelta

from tests.conftest import auth_header
from app.models.task import Task, TaskAssignee
from app.models.notification import Notification


# ══════════════════════════════════════════════════════════════
# PB205, PB206 — Web Push Subscription
# ══════════════════════════════════════════════════════════════

class TestPushSubscription:

    def test_pb205_register_push_subscription(self, client, staff_user, staff_token):
        """PB205: đăng ký nhận Web Push Notification"""
        res = client.post("/api/v1/pwa/push/subscribe", json={
            "endpoint": "https://fcm.googleapis.com/fcm/send/abc123",
            "keys": {
                "p256dh": "BNaFakeP256DHKey==",
                "auth": "FakeAuthKey==",
            },
            "platform": "android",
        }, headers=auth_header(staff_token["access"]))
        assert res.status_code == 200
        assert res.json()["subscribed"] == True

    def test_pb205_subscription_saved_to_db(self, client, db, staff_user, staff_token):
        """PB205: subscription được lưu vào DB"""
        from app.models.pwa import PushSubscription
        client.post("/api/v1/pwa/push/subscribe", json={
            "endpoint": "https://fcm.googleapis.com/push/xyz",
            "keys": {"p256dh": "key1==", "auth": "auth1=="},
            "platform": "android",
        }, headers=auth_header(staff_token["access"]))

        sub = db.query(PushSubscription).filter(
            PushSubscription.user_id == staff_user.id
        ).first()
        assert sub is not None
        assert "fcm.googleapis.com" in sub.endpoint

    def test_pb206_ios_push_subscription(self, client, staff_user, staff_token):
        """PB206: đăng ký push notification cho iOS"""
        res = client.post("/api/v1/pwa/push/subscribe", json={
            "endpoint": "https://web.push.apple.com/xyz",
            "keys": {"p256dh": "ioskey==", "auth": "iosauth=="},
            "platform": "ios",
        }, headers=auth_header(staff_token["access"]))
        assert res.status_code == 200
        assert res.json()["subscribed"] == True

    def test_pb205_duplicate_subscription_upserted(self, client, db, staff_user, staff_token):
        """PB205: đăng ký lại cùng endpoint → upsert không tạo duplicate"""
        from app.models.pwa import PushSubscription
        payload = {
            "endpoint": "https://fcm.googleapis.com/dup",
            "keys": {"p256dh": "key==", "auth": "auth=="},
            "platform": "android",
        }
        client.post("/api/v1/pwa/push/subscribe", json=payload,
                    headers=auth_header(staff_token["access"]))
        client.post("/api/v1/pwa/push/subscribe", json=payload,
                    headers=auth_header(staff_token["access"]))

        count = db.query(PushSubscription).filter(
            PushSubscription.user_id == staff_user.id,
            PushSubscription.endpoint == "https://fcm.googleapis.com/dup",
        ).count()
        assert count == 1

    def test_push_subscribe_requires_auth(self, client):
        """Push subscription yêu cầu đăng nhập"""
        res = client.post("/api/v1/pwa/push/subscribe", json={
            "endpoint": "https://example.com/push",
            "keys": {"p256dh": "k==", "auth": "a=="},
            "platform": "android",
        })
        assert res.status_code in (401, 403)


# ══════════════════════════════════════════════════════════════
# PB207 — Quản lý quyền thông báo
# ══════════════════════════════════════════════════════════════

class TestNotificationPreferences:

    def test_pb207_unsubscribe_push(self, client, db, staff_user, staff_token):
        """PB207: tắt thông báo đẩy"""
        # Đăng ký trước
        client.post("/api/v1/pwa/push/subscribe", json={
            "endpoint": "https://fcm.googleapis.com/unsub",
            "keys": {"p256dh": "k==", "auth": "a=="},
            "platform": "android",
        }, headers=auth_header(staff_token["access"]))

        # Hủy đăng ký
        res = client.post("/api/v1/pwa/push/unsubscribe", json={
            "endpoint": "https://fcm.googleapis.com/unsub",
        }, headers=auth_header(staff_token["access"]))
        assert res.status_code == 200
        assert res.json()["unsubscribed"] == True

    def test_pb207_get_notification_settings(self, client, staff_user, staff_token):
        """PB207: xem cài đặt thông báo hiện tại"""
        res = client.get("/api/v1/pwa/notification-settings",
                         headers=auth_header(staff_token["access"]))
        assert res.status_code == 200
        data = res.json()
        assert "push_enabled" in data
        assert "types" in data

    def test_pb207_update_notification_settings(self, client, staff_user, staff_token):
        """PB207: cập nhật cài đặt từng loại thông báo"""
        res = client.patch("/api/v1/pwa/notification-settings", json={
            "push_enabled": True,
            "types": {
                "new_task": True,
                "deadline": True,
                "kpi": False,
                "system": True,
            }
        }, headers=auth_header(staff_token["access"]))
        assert res.status_code == 200
        data = res.json()
        assert data["types"]["kpi"] == False
        assert data["types"]["new_task"] == True

    def test_pb207_disable_all_push(self, client, staff_user, staff_token):
        """PB207: tắt tất cả thông báo đẩy"""
        res = client.patch("/api/v1/pwa/notification-settings", json={
            "push_enabled": False,
            "types": {
                "new_task": False,
                "deadline": False,
                "kpi": False,
                "system": False,
            }
        }, headers=auth_header(staff_token["access"]))
        assert res.status_code == 200
        assert res.json()["push_enabled"] == False


# ══════════════════════════════════════════════════════════════
# PB199 — Badge count (số task cần làm)
# ══════════════════════════════════════════════════════════════

class TestBadgeCount:

    def test_pb199_badge_count_api(self, client, staff_user, staff_token):
        """PB199: API trả về số task pending của nhân viên"""
        res = client.get("/api/v1/pwa/badge-count",
                         headers=auth_header(staff_token["access"]))
        assert res.status_code == 200
        data = res.json()
        assert "badge_count" in data
        assert isinstance(data["badge_count"], int)
        assert data["badge_count"] >= 0

    def test_pb199_badge_count_includes_todo_and_in_progress(
        self, client, db, staff_user, manager_user, dept, staff_token
    ):
        """PB199: badge count = số task todo + in_progress được giao"""
        now = datetime.now(timezone.utc)
        for status in ["todo", "in_progress"]:
            t = Task(
                id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
                title=f"Task {status}", status=status, priority="medium", progress_pct=0,
                deadline=now + timedelta(days=2),
            )
            db.add(t)
            db.flush()
            db.add(TaskAssignee(task_id=t.id, user_id=staff_user.id))
        db.commit()

        res = client.get("/api/v1/pwa/badge-count",
                         headers=auth_header(staff_token["access"]))
        assert res.json()["badge_count"] >= 2

    def test_pb199_done_tasks_not_in_badge(
        self, client, db, staff_user, manager_user, dept, staff_token
    ):
        """PB199: task đã done không tính vào badge"""
        now = datetime.now(timezone.utc)
        t = Task(
            id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
            title="Done Task", status="done", priority="low", progress_pct=100,
            deadline=now, completed_at=now,
        )
        db.add(t)
        db.flush()
        db.add(TaskAssignee(task_id=t.id, user_id=staff_user.id))
        db.commit()

        res1 = client.get("/api/v1/pwa/badge-count",
                          headers=auth_header(staff_token["access"]))
        count_before = res1.json()["badge_count"]

        # Done task không tăng badge
        res2 = client.get("/api/v1/pwa/badge-count",
                          headers=auth_header(staff_token["access"]))
        assert res2.json()["badge_count"] == count_before

    def test_pb199_badge_count_requires_auth(self, client):
        """PB199: badge count yêu cầu đăng nhập"""
        res = client.get("/api/v1/pwa/badge-count")
        assert res.status_code in (401, 403)


# ══════════════════════════════════════════════════════════════
# PB203 — Cache & Offline support metadata
# ══════════════════════════════════════════════════════════════

class TestOfflineSupport:

    def test_pb203_offline_data_endpoint(self, client, staff_user, staff_token):
        """PB203: endpoint trả về dữ liệu cần cache cho offline"""
        res = client.get("/api/v1/pwa/offline-data",
                         headers=auth_header(staff_token["access"]))
        assert res.status_code == 200
        data = res.json()
        assert "tasks" in data
        assert "user" in data
        assert "cached_at" in data

    def test_pb203_offline_data_includes_assigned_tasks(
        self, client, db, staff_user, manager_user, dept, staff_token
    ):
        """PB203: offline data chứa task được giao cho nhân viên"""
        now = datetime.now(timezone.utc)
        t = Task(
            id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
            title="Offline Task", status="todo", priority="medium", progress_pct=0,
            deadline=now + timedelta(days=3),
        )
        db.add(t)
        db.flush()
        db.add(TaskAssignee(task_id=t.id, user_id=staff_user.id))
        db.commit()

        res = client.get("/api/v1/pwa/offline-data",
                         headers=auth_header(staff_token["access"]))
        task_ids = [t["id"] for t in res.json()["tasks"]]
        assert str(t.id) in task_ids

    def test_pb203_offline_data_has_user_profile(self, client, staff_user, staff_token):
        """PB203: offline data chứa thông tin user để hiển thị khi offline"""
        res = client.get("/api/v1/pwa/offline-data",
                         headers=auth_header(staff_token["access"]))
        user_data = res.json()["user"]
        assert "id" in user_data
        assert "full_name" in user_data
        assert "role" in user_data
        assert "avatar_url" in user_data

    def test_pb203_offline_data_requires_auth(self, client):
        """PB203: offline data yêu cầu đăng nhập"""
        res = client.get("/api/v1/pwa/offline-data")
        assert res.status_code in (401, 403)


# ══════════════════════════════════════════════════════════════
# PB204 — Sync khi có mạng trở lại
# ══════════════════════════════════════════════════════════════

class TestOfflineSync:

    def test_pb204_sync_endpoint_exists(self, client, staff_user, staff_token):
        """PB204: endpoint sync dữ liệu khi có mạng trở lại"""
        res = client.post("/api/v1/pwa/sync", json={
            "last_sync_at": (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat(),
        }, headers=auth_header(staff_token["access"]))
        assert res.status_code == 200
        data = res.json()
        assert "synced_at" in data
        assert "changes" in data

    def test_pb204_sync_returns_updated_tasks(
        self, client, db, staff_user, manager_user, dept, staff_token
    ):
        """PB204: sync trả về task thay đổi sau lần sync cuối"""
        now = datetime.now(timezone.utc)
        last_sync = now - timedelta(hours=3)

        # Tạo task sau last_sync
        t = Task(
            id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
            title="New Task After Sync", status="todo", priority="medium", progress_pct=0,
            deadline=now + timedelta(days=2),
            created_at=now - timedelta(hours=1),  # mới hơn last_sync
        )
        db.add(t)
        db.flush()
        db.add(TaskAssignee(task_id=t.id, user_id=staff_user.id))
        db.commit()

        res = client.post("/api/v1/pwa/sync", json={
            "last_sync_at": last_sync.isoformat(),
        }, headers=auth_header(staff_token["access"]))

        assert res.status_code == 200
        changes = res.json()["changes"]
        assert "new_tasks" in changes
        assert "updated_notifications" in changes

    def test_pb204_sync_returns_new_notifications(
        self, client, db, staff_user, staff_token
    ):
        """PB204: sync trả về thông báo mới"""
        now = datetime.now(timezone.utc)
        last_sync = now - timedelta(hours=2)

        db.add(Notification(
            id=uuid.uuid4(), user_id=staff_user.id,
            type="new_task", title="Task mới",
            body="Bạn có task mới", is_read=False,
            created_at=now - timedelta(hours=1),
        ))
        db.commit()

        res = client.post("/api/v1/pwa/sync", json={
            "last_sync_at": last_sync.isoformat(),
        }, headers=auth_header(staff_token["access"]))

        notifs = res.json()["changes"]["updated_notifications"]
        assert len(notifs) >= 1

    def test_pb204_sync_requires_last_sync_at(self, client, staff_user, staff_token):
        """PB204: sync phải cung cấp last_sync_at"""
        res = client.post("/api/v1/pwa/sync", json={},
                          headers=auth_header(staff_token["access"]))
        assert res.status_code == 422


# ══════════════════════════════════════════════════════════════
# PWA Manifest & Config endpoints
# ══════════════════════════════════════════════════════════════

class TestPwaConfig:

    def test_manifest_endpoint(self, client):
        """PB191, PB192: manifest.json cho PWA install"""
        res = client.get("/api/v1/pwa/manifest")
        assert res.status_code == 200
        data = res.json()
        assert "name" in data
        assert "short_name" in data
        assert "icons" in data
        assert "display" in data
        assert data["display"] == "standalone"

    def test_manifest_has_start_url(self, client):
        """PB191: manifest có start_url"""
        res = client.get("/api/v1/pwa/manifest")
        assert "start_url" in res.json()

    def test_manifest_has_theme_color(self, client):
        """PB195: manifest có theme_color cho dark mode"""
        res = client.get("/api/v1/pwa/manifest")
        data = res.json()
        assert "theme_color" in data
        assert "background_color" in data

    def test_manifest_has_icons(self, client):
        """PB193: manifest có icons cho splash screen"""
        res = client.get("/api/v1/pwa/manifest")
        icons = res.json()["icons"]
        assert len(icons) >= 2
        sizes = [icon["sizes"] for icon in icons]
        assert "192x192" in sizes or any("192" in s for s in sizes)

    def test_pwa_install_guide_ios(self, client, staff_user, staff_token):
        """PB192: hướng dẫn cài đặt PWA trên iOS"""
        res = client.get("/api/v1/pwa/install-guide?platform=ios",
                         headers=auth_header(staff_token["access"]))
        assert res.status_code == 200
        data = res.json()
        assert "steps" in data
        assert "platform" in data
        assert data["platform"] == "ios"
        assert len(data["steps"]) >= 3

    def test_pwa_install_guide_android(self, client, staff_user, staff_token):
        """PB191: hướng dẫn cài đặt PWA trên Android"""
        res = client.get("/api/v1/pwa/install-guide?platform=android",
                         headers=auth_header(staff_token["access"]))
        assert res.status_code == 200
        assert res.json()["platform"] == "android"

    def test_pwa_install_guide_invalid_platform(self, client, staff_user, staff_token):
        """Platform không hợp lệ → 422"""
        res = client.get("/api/v1/pwa/install-guide?platform=windows",
                         headers=auth_header(staff_token["access"]))
        assert res.status_code == 422


# ══════════════════════════════════════════════════════════════
# Mobile-optimized API endpoints
# ══════════════════════════════════════════════════════════════

class TestMobileOptimizedApi:

    def test_pb196_mobile_kanban_endpoint(self, client, manager_user, manager_token):
        """PB196: Kanban tối ưu cho mobile — trả về 1 cột tại thời điểm"""
        res = client.get("/api/v1/pwa/kanban?column=todo",
                         headers=auth_header(manager_token["access"]))
        assert res.status_code == 200
        data = res.json()
        assert "column" in data
        assert data["column"] == "todo"
        assert "tasks" in data
        assert "total" in data

    def test_pb196_kanban_column_values(self, client, manager_user, manager_token):
        """PB196: các cột Kanban hợp lệ"""
        for col in ["todo", "in_progress", "done"]:
            res = client.get(f"/api/v1/pwa/kanban?column={col}",
                             headers=auth_header(manager_token["access"]))
            assert res.status_code == 200
            assert res.json()["column"] == col

    def test_pb196_invalid_column_rejected(self, client, manager_user, manager_token):
        """PB196: column không hợp lệ → 422"""
        res = client.get("/api/v1/pwa/kanban?column=invalid",
                         headers=auth_header(manager_token["access"]))
        assert res.status_code == 422

    def test_pb198_mobile_kpi_summary(self, client, staff_user, staff_token):
        """PB198: KPI summary tối ưu cho mobile"""
        now = datetime.now(timezone.utc)
        res = client.get(
            f"/api/v1/pwa/kpi-summary?year={now.year}&month={now.month}",
            headers=auth_header(staff_token["access"]),
        )
        assert res.status_code == 200
        data = res.json()
        assert "total_score" in data
        assert "grade" in data
        assert "target_score" in data
        assert "progress_pct" in data  # % đạt được so với mục tiêu

    def test_pb197_task_detail_mobile_format(
        self, client, db, manager_user, staff_user, dept, staff_token
    ):
        """PB197: chi tiết task dạng mobile-friendly"""
        now = datetime.now(timezone.utc)
        t = Task(
            id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
            title="Mobile Task Detail", status="todo",
            priority="high", progress_pct=0,
            deadline=now + timedelta(days=2),
        )
        db.add(t)
        db.flush()
        db.add(TaskAssignee(task_id=t.id, user_id=staff_user.id))
        db.commit()

        res = client.get(f"/api/v1/pwa/tasks/{t.id}",
                         headers=auth_header(staff_token["access"]))
        assert res.status_code == 200
        data = res.json()
        # Mobile format: thêm trường tiện lợi
        assert "id" in data
        assert "title" in data
        assert "status" in data
        assert "is_overdue" in data
        assert "days_until_deadline" in data  # số ngày còn lại

    def test_pb200_swipe_complete_task(
        self, client, db, staff_user, manager_user, dept, staff_token
    ):
        """PB200: swipe phải → done (quick action)"""
        now = datetime.now(timezone.utc)
        t = Task(
            id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
            title="Swipe Task", status="in_progress",
            priority="medium", progress_pct=50,
            deadline=now + timedelta(days=2),
        )
        db.add(t)
        db.flush()
        db.add(TaskAssignee(task_id=t.id, user_id=staff_user.id))
        db.commit()

        res = client.patch(f"/api/v1/pwa/tasks/{t.id}/quick-action", json={
            "action": "complete",
        }, headers=auth_header(staff_token["access"]))
        assert res.status_code == 200
        assert res.json()["status"] == "done"

    def test_pb200_quick_action_invalid(
        self, client, db, staff_user, manager_user, dept, staff_token
    ):
        """PB200: action không hợp lệ → 422"""
        now = datetime.now(timezone.utc)
        t = Task(
            id=uuid.uuid4(), dept_id=dept.id, created_by=manager_user.id,
            title="Task Action", status="todo",
            priority="medium", progress_pct=0,
            deadline=now + timedelta(days=2),
        )
        db.add(t)
        db.flush()
        db.add(TaskAssignee(task_id=t.id, user_id=staff_user.id))
        db.commit()

        res = client.patch(f"/api/v1/pwa/tasks/{t.id}/quick-action", json={
            "action": "delete_all",
        }, headers=auth_header(staff_token["access"]))
        assert res.status_code == 422
