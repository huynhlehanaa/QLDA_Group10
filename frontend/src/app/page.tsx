import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page">
      <section className="card">
        <h1 className="title">KPI Noi Bo</h1>
        <p className="muted">He thong danh gia KPI cho nhan vien.</p>
        <div className="row">
          <Link href="/auth/login">Dang nhap</Link>
          <Link href="/employee/profile">Ho so ca nhan</Link>
        </div>
      </section>
    </main>
  );
}
