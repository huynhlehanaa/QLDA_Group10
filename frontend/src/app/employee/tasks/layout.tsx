'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TASK_TABS = [
  { href: '/employee/tasks/list', label: 'Danh sách' },
  { href: '/employee/tasks/kanban', label: 'Kanban' },
];

export default function EmployeeTasksLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <section className="tasks-shell stack">
      <div className="panel tasks-hero">
        <div className="tasks-copy">
          <p className="eyebrow">Sprint 2</p>
          <h1>Công việc của tôi</h1>
          <p>Theo dõi danh sách và bảng Kanban trong một không gian làm việc gọn.</p>
        </div>

        <nav className="tasks-tabs" aria-label="Task views">
          {TASK_TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`tasks-tab ${pathname === tab.href ? 'active' : ''}`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>

      {children}

      <style jsx>{`
        .tasks-shell {
          padding-bottom: 8px;
        }

        .tasks-hero {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
          padding: 20px 24px;
        }

        .tasks-copy {
          display: grid;
          gap: 8px;
          max-width: 44rem;
        }

        .eyebrow {
          margin: 0;
          font-size: 0.78rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--muted);
          font-weight: 700;
        }

        .tasks-copy h1 {
          margin: 0;
          font-size: clamp(1.6rem, 2vw, 2.1rem);
          line-height: 1.1;
        }

        .tasks-copy p {
          margin: 0;
          color: var(--muted);
        }

        .tasks-tabs {
          display: inline-flex;
          gap: 10px;
          flex-wrap: wrap;
          padding: 4px;
          background: var(--bg-alt);
          border: 1px solid var(--border);
          border-radius: 999px;
        }

        .tasks-tab {
          padding: 9px 14px;
          border-radius: 999px;
          text-decoration: none;
          color: var(--muted);
          font-weight: 600;
          transition: all 140ms ease;
        }

        .tasks-tab:hover {
          color: var(--ink);
          background: rgba(15, 93, 130, 0.08);
        }

        .tasks-tab.active {
          color: var(--brand-strong);
          background: var(--brand-soft);
        }

        @media (max-width: 720px) {
          .tasks-hero {
            align-items: stretch;
          }

          .tasks-tabs {
            width: 100%;
            justify-content: stretch;
          }

          .tasks-tab {
            flex: 1;
            text-align: center;
          }
        }
      `}</style>
    </section>
  );
}