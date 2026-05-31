#!/usr/bin/env python
import psycopg2
import uuid
import bcrypt

DB = {
    "dbname": "kpi_system",
    "user": "admin",
    "password": "secret123",
    "host": "localhost",
    "port": 5432,
}

USERS = [
    ("nv1", "nv1@company.com", "Nhân viên 1"),
    ("nv2", "nv2@company.com", "Nhân viên 2"),
    ("nv3", "nv3@company.com", "Nhân viên 3"),
]
PASSWORD = "Nv1@12345"


def ensure_org_and_dept(cur):
    cur.execute('SELECT id FROM "ORGANIZATIONS" LIMIT 1;')
    row = cur.fetchone()
    if row:
        org_id = row[0]
    else:
        org_id = str(uuid.uuid4())
        cur.execute('INSERT INTO "ORGANIZATIONS" (id, name) VALUES (%s, %s);', (org_id, 'Công ty KPI Mẫu'))

    cur.execute('SELECT id FROM "DEPARTMENTS" WHERE org_id = %s LIMIT 1;', (org_id,))
    row = cur.fetchone()
    if row:
        dept_id = row[0]
    else:
        dept_id = str(uuid.uuid4())
        cur.execute('INSERT INTO "DEPARTMENTS" (id, org_id, name, is_active) VALUES (%s, %s, %s, %s);', (dept_id, org_id, 'Nhân viên', True))

    return org_id, dept_id


def seed_users():
    conn = psycopg2.connect(**DB)
    try:
        cur = conn.cursor()
        org_id, dept_id = ensure_org_and_dept(cur)

        created = []
        for uname, email, fullname in USERS:
            cur.execute('SELECT id FROM "USERS" WHERE email = %s;', (email,))
            if cur.fetchone():
                print('User already exists:', email)
                continue
            uid = str(uuid.uuid4())
            pw_hash = bcrypt.hashpw(PASSWORD.encode(), bcrypt.gensalt()).decode()
            cur.execute(
                'INSERT INTO "USERS" (id, org_id, dept_id, full_name, email, password_hash, role, is_active, must_change_pw, failed_login_count) '
                'VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s);',
                (uid, org_id, dept_id, fullname, email, pw_hash, 'staff', True, True, 0),
            )
            created.append((email, PASSWORD))
            print('Created user:', email)

        conn.commit()
        if created:
            print('\nSeeded users:')
            for e, p in created:
                print(e, p)
        else:
            print('No new users created.')
    finally:
        conn.close()


if __name__ == '__main__':
    seed_users()
