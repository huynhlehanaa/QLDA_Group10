import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <div className="grid min-h-screen place-content-center px-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-panel">
        <h1 className="text-2xl font-semibold text-ink">404</h1>
        <p className="mt-2 text-sm text-slate-600">Không tìm thấy trang bạn đang truy cập.</p>
        <Link to="/" className="mt-4 inline-block text-sm font-medium text-brand underline">
          Về trang chính
        </Link>
      </div>
    </div>
  )
}

export default NotFoundPage
