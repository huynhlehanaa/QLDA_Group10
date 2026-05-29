import { Link } from 'react-router-dom'

function UnauthorizedPage() {
  return (
    <div className="grid min-h-screen place-content-center px-4">
      <div className="max-w-md rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
        <h1 className="text-xl font-semibold text-rose-800">Bạn không có quyền truy cập</h1>
        <p className="mt-2 text-sm text-rose-700">
          Tài khoản hiện tại không được phép truy cập khu vực này.
        </p>
        <Link to="/login" className="mt-4 inline-block text-sm font-medium text-rose-900 underline">
          Quay về trang đăng nhập
        </Link>
      </div>
    </div>
  )
}

export default UnauthorizedPage
