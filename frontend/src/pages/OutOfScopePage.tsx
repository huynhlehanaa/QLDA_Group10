import { Link } from 'react-router-dom'

function OutOfScopePage() {
  return (
    <div className="grid min-h-screen place-content-center px-4">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-panel">
        <h1 className="text-xl font-semibold text-ink">Màn hình chưa nằm trong phạm vi hiện tại</h1>
        <p className="mt-2 text-sm text-slate-600">
          Phiên bản này đang tập trung vào các tính năng dành cho nhân viên trong Sprint 1.
        </p>
        <Link to="/login" className="mt-4 inline-block text-sm font-medium text-brand underline">
          Quay lại đăng nhập
        </Link>
      </div>
    </div>
  )
}

export default OutOfScopePage
