import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import AppShell from './components/layout/AppShell'
import ProtectedRoute from './routes/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import OtpPage from './pages/OtpPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import EmployeeHomePage from './pages/EmployeeHomePage'
import ProfileSecurityPage from './pages/ProfileSecurityPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import UnauthorizedPage from './pages/UnauthorizedPage'
import OutOfScopePage from './pages/OutOfScopePage'
import NotFoundPage from './pages/NotFoundPage'
import TasksPage from './pages/TasksPage'
import EmployeeKpiPage from './pages/EmployeeKpiPage'
import EmployeeNotificationsPage from './pages/EmployeeNotificationsPage'
import EmployeeCalendarPage from './pages/EmployeeCalendarPage'
import EmployeeHelpCenterPage from './pages/EmployeeHelpCenterPage'
import EmployeeSettingsPage from './pages/EmployeeSettingsPage'

function RedirectToProfileSecurity() {
  return <Navigate to="/profile-security" replace />
}

function RedirectToChangePassword() {
  return <Navigate to="/change-password" replace />
}

function RedirectToEmployeeTasks() {
  return <Navigate to="/employee/tasks" replace />
}

function RedirectToEmployeeHelp() {
  return <Navigate to="/employee/help" replace />
}

function RootRedirect() {
  const { isAuthenticated, session } = useAuth()

  if (!isAuthenticated || !session) {
    return <Navigate to="/login" replace />
  }

  if (session.mustChangePassword) {
    return <Navigate to="/change-password" replace />
  }

  if (session.role === 'staff') {
    return <Navigate to="/employee" replace />
  }

  return <Navigate to="/out-of-scope" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/otp" element={<OtpPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/out-of-scope" element={<OutOfScopePage />} />

      <Route element={<ProtectedRoute allowedRoles={['staff']} />}>
        <Route element={<AppShell />}>
          <Route path="/profile" element={<RedirectToProfileSecurity />} />
          <Route path="/settings/change-password" element={<RedirectToChangePassword />} />
          <Route path="/settings/install-guide" element={<RedirectToEmployeeHelp />} />
          <Route path="/tasks/me" element={<RedirectToEmployeeTasks />} />
          <Route path="/employee" element={<EmployeeHomePage />} />
          <Route path="/employee/kpi" element={<EmployeeKpiPage />} />
          <Route path="/employee/notifications" element={<EmployeeNotificationsPage />} />
          <Route path="/employee/help" element={<EmployeeHelpCenterPage />} />
          <Route path="/employee/settings" element={<EmployeeSettingsPage />} />
          <Route path="/employee/calendar" element={<EmployeeCalendarPage />} />
          <Route path="/employee/tasks" element={<TasksPage />} />
          <Route path="/profile-security" element={<ProfileSecurityPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App