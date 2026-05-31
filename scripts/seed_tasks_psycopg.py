#!/usr/bin/env python
import psycopg2
import uuid
from datetime import datetime, timedelta

DB = {
    "dbname": "kpi_system",
    "user": "admin",
    "password": "secret123",
    "host": "localhost",
    "port": 5432,
}

SAMPLE_TITLES = [
    "Hoàn thiện báo cáo doanh thu tháng",
    "Cập nhật dữ liệu khách hàng",
    "Kiểm thử module onboarding",
    "Chuẩn bị slides cho cuộc họp",
    "Xử lý phản hồi khách hàng",
    "Tối ưu hóa truy vấn báo cáo",
    "Hoàn thành task giao diện người dùng",
    "Viết unit tests cho API",
    "Tạo tài liệu hướng dẫn nội bộ",
    "Triển khai bản vá bảo mật",
    "Kiểm tra tính năng thông báo",
    "Lên kế hoạch sprint tiếp theo",
]

def seed_tasks(n=12):
    conn = psycopg2.connect(**DB)
    try:
        cur = conn.cursor()
        # find department
        cur.execute('SELECT id FROM "DEPARTMENTS" LIMIT 1;')
        row = cur.fetchone()
        if not row:
            raise RuntimeError('No department found; ensure organizations/departments seeded')
        dept_id = row[0]

        # get available users (limit)
        cur.execute('SELECT id, email FROM "USERS" ORDER BY created_at LIMIT 10;')
        users = cur.fetchall()
        if not users:
            raise RuntimeError('No users found; seed users first')
        user_ids = [u[0] for u in users]

        created = []
        for i in range(min(n, len(SAMPLE_TITLES))):
            tid = str(uuid.uuid4())
            title = SAMPLE_TITLES[i]
            desc = f"Mô tả mẫu cho: {title}"
            created_by = user_ids[i % len(user_ids)]
            status = 'todo' if i % 3 == 0 else ('in_progress' if i % 3 == 1 else 'done')
            priority = 'high' if i % 4 == 0 else ('medium' if i % 4 ==1 else 'low')
            progress = 0 if status=='todo' else (50 if status=='in_progress' else 100)
            deadline = datetime.utcnow() + timedelta(days=3 + i)
            created_at = datetime.utcnow() - timedelta(days=i//2)

            cur.execute(
                'INSERT INTO "TASKS" (id, dept_id, created_by, title, description, status, priority, progress_pct, deadline, created_at) '
                'VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s);',
                (tid, dept_id, created_by, title, desc, status, priority, progress, deadline, created_at)
            )

            # assign to one or two users
            assignees = [user_ids[(i)%len(user_ids)]]
            if len(user_ids) > 1:
                assignees.append(user_ids[(i+1)%len(user_ids)])
            for uid in assignees:
                cur.execute('INSERT INTO "TASK_ASSIGNEES" (task_id, user_id) VALUES (%s,%s) ON CONFLICT DO NOTHING;', (tid, uid))

            created.append(title)

        conn.commit()
        print(f"Inserted {len(created)} tasks")
    finally:
        conn.close()


if __name__ == '__main__':
    seed_tasks(12)
