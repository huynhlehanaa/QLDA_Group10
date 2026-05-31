import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { UserRole } from '../types/auth'

interface ProtectedRouteProps {
  allowedRoles: UserRole[]
}

function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, session, isBootstrapping } = useAuth()
  const location = useLocation()

  if (isBootstrapping) {
    return (
      <div className="grid min-h-screen place-content-center text-ink">
        Đang tải phiên làm việc...
      </div>
    )
  }

  if (!isAuthenticated || !session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (!allowedRoles.includes(session.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
