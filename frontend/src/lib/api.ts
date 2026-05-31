import axios from 'axios'
import { http } from './http'
import type { LoginResponse, UserProfile } from '../types/auth'
import type {
  AttachmentItem,
  ChecklistItem,
  CommentItem,
  KanbanBoard,
  TaskDetail,
  TaskFilterParams,
  TaskListItem,
  TaskStatus,
  ExtensionRequest,
} from '../types/task'
import type {
  NotificationListResponse,
} from '../types/notification'
import type {
  CalendarDayResponse,
  CalendarMonthResponse,
  CalendarWeekResponse,
} from '../types/dashboard'
import type { StaffDashboardResponse } from '../types/dashboard'
import type {
  PwaBadgeCountResponse,
  PwaInstallGuideResponse,
  PwaMobileKanbanResponse,
  PwaMobileTaskDetailResponse,
  PwaNotificationSettingsResponse,
  PwaOfflineDataResponse,
  PwaQuickActionResponse,
  PwaSyncResponse,
} from '../types/pwa'
import type {
  KpiAppealCreatePayload,
  KpiAppealItem,
  KpiCompareResponse,
  KpiHistoryItem,
  KpiMonthlyResult,
  KpiTargetResponse,
  KpiTargetUpsertPayload,
} from '../types/kpi'

interface ApiErrorDetailObject {
  code?: string
  message?: string
}

export function getApiErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return 'Đã có lỗi không xác định, vui lòng thử lại.'
  }

  const detail = error.response?.data?.detail as
    | string
    | ApiErrorDetailObject
    | undefined

  if (typeof detail === 'string') {
    return detail
  }

  if (detail?.message) {
    return detail.message
  }

  return 'Không thể xử lý yêu cầu. Vui lòng thử lại.'
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await http.post<LoginResponse>('/auth/login', { email, password })
  return data
}

export async function sendOtp(email: string): Promise<void> {
  await http.post('/auth/otp/send', { email })
}

export async function verifyOtp(email: string, otp: string): Promise<{
  access_token: string
  refresh_token: string
}> {
  const { data } = await http.post('/auth/otp/verify', { email, otp })
  return data
}

export async function refreshToken(refreshToken: string): Promise<{
  access_token: string
  refresh_token: string
}> {
  const { data } = await http.post('/auth/refresh', { refresh_token: refreshToken })
  return data
}

export async function logoutCurrent(refreshToken: string): Promise<void> {
  await http.post('/auth/logout', { refresh_token: refreshToken })
}

export async function logoutAll(): Promise<void> {
  await http.post('/auth/logout-all')
}

export async function forgotPassword(email: string): Promise<void> {
  await http.post('/auth/forgot-password', { email })
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await http.post('/auth/reset-password', { token, new_password: newPassword })
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  await http.post('/auth/change-password', {
    old_password: oldPassword,
    new_password: newPassword,
  })
}

export async function getProfile(): Promise<UserProfile> {
  const { data } = await http.get<UserProfile>('/users/me')
  return data
}

export async function updateAvatar(avatarUrl: string): Promise<void> {
  await http.patch('/users/me/avatar', { avatar_url: avatarUrl })
}

export async function updatePhone(phone: string): Promise<void> {
  await http.patch('/users/me/phone', { phone })
}

export async function getOnboardingChecklist(): Promise<{
  items: Array<{
    step_id: string
    title: string
    description: string
    action_url: string
    is_done: boolean
    order: number
  }>
  done_count: number
  total: number
  completion_pct: number
  is_complete: boolean
}> {
  const { data } = await http.get('/onboarding/checklist')
  return data
}

export async function getMyKpi(year?: number, month?: number): Promise<KpiMonthlyResult> {
  const { data } = await http.get('/kpi/me', { params: { year, month } })
  return data
}

export async function getMyKpiHistory(months = 12): Promise<KpiHistoryItem[]> {
  const { data } = await http.get('/kpi/me/history', { params: { months } })
  return data
}

export async function compareMyKpi(year?: number, month?: number): Promise<KpiCompareResponse> {
  const { data } = await http.get('/kpi/me/compare', { params: { year, month } })
  return data
}

export async function setMyKpiTarget(payload: KpiTargetUpsertPayload): Promise<KpiTargetResponse> {
  const { data } = await http.post('/kpi/me/target', payload)
  return data
}

export async function createKpiAppeal(payload: KpiAppealCreatePayload): Promise<KpiAppealItem> {
  const { data } = await http.post('/kpi/appeals', payload)
  return data
}

export async function getStaffDashboard(): Promise<StaffDashboardResponse> {
  const { data } = await http.get('/dashboard/staff')
  return data
}

export async function getCalendarMonth(year?: number, month?: number): Promise<CalendarMonthResponse> {
  const { data } = await http.get('/dashboard/calendar', { params: { year, month } })
  return data
}

export async function getCalendarWeek(date?: string): Promise<CalendarWeekResponse> {
  const { data } = await http.get('/dashboard/calendar/week', { params: { date } })
  return data
}

export async function getCalendarDay(date?: string): Promise<CalendarDayResponse> {
  const { data } = await http.get('/dashboard/calendar/day', { params: { date } })
  return data
}

export async function getNotifications(params: { unread_only?: boolean; page?: number; page_size?: number } = {}): Promise<NotificationListResponse> {
  const { data } = await http.get('/notifications', { params })
  return data
}

export async function getPwaBadgeCount(): Promise<PwaBadgeCountResponse> {
  const { data } = await http.get('/pwa/badge-count')
  return data
}

export async function getPwaInstallGuide(platform: 'android' | 'ios'): Promise<PwaInstallGuideResponse> {
  const { data } = await http.get('/pwa/install-guide', { params: { platform } })
  return data
}

export async function getPwaNotificationSettings(): Promise<PwaNotificationSettingsResponse> {
  const { data } = await http.get('/pwa/notification-settings')
  return data
}

export async function updatePwaNotificationSettings(payload: PwaNotificationSettingsResponse): Promise<PwaNotificationSettingsResponse> {
  const { data } = await http.patch('/pwa/notification-settings', payload)
  return data
}

export async function getPwaOfflineData(): Promise<PwaOfflineDataResponse> {
  const { data } = await http.get('/pwa/offline-data')
  return data
}

export async function syncPwaData(lastSyncAt: string): Promise<PwaSyncResponse> {
  const { data } = await http.post('/pwa/sync', { last_sync_at: lastSyncAt })
  return data
}

export async function getMobileKanban(column: 'todo' | 'in_progress' | 'done'): Promise<PwaMobileKanbanResponse> {
  const { data } = await http.get('/pwa/kanban', { params: { column } })
  return data
}

export async function getMobileTaskDetail(taskId: string): Promise<PwaMobileTaskDetailResponse> {
  const { data } = await http.get(`/pwa/tasks/${taskId}`)
  return data
}

export async function quickActionTask(taskId: string, action: 'complete'): Promise<PwaQuickActionResponse> {
  const { data } = await http.patch(`/pwa/tasks/${taskId}/quick-action`, { action })
  return data
}

export async function markNotificationRead(notificationId: string): Promise<{ id: string; is_read: boolean }> {
  const { data } = await http.patch(`/notifications/${notificationId}/read`)
  return data
}

export async function markAllNotificationsRead(): Promise<{ marked_count: number }> {
  const { data } = await http.post('/notifications/read-all')
  return data
}

// ----- Task API client (Sprint 2) -----
export async function getTasks(params: TaskFilterParams = {}): Promise<TaskListItem[]> {
  const { data } = await http.get('/tasks', { params })
  return data
}

export async function getKanban(params: Partial<TaskFilterParams> = {}): Promise<KanbanBoard> {
  const { data } = await http.get('/tasks/kanban', { params })
  return data
}

export async function getTask(taskId: string): Promise<TaskDetail> {
  const { data } = await http.get(`/tasks/${taskId}`)
  return data
}

export async function updateTaskStatus(taskId: string, status?: TaskStatus, progress_pct?: number): Promise<{ id: string; status: TaskStatus; progress_pct?: number }> {
  const body: { status?: TaskStatus; progress_pct?: number } = {}
  if (status !== undefined) body.status = status
  if (progress_pct !== undefined) body.progress_pct = progress_pct
  const { data } = await http.patch(`/tasks/${taskId}/status`, body)
  return data
}

export async function updateTaskProgress(taskId: string, progress_pct: number): Promise<{ id: string; progress_pct: number; status?: TaskStatus }> {
  const { data } = await http.patch(`/tasks/${taskId}/progress`, { progress_pct })
  return data
}

export async function addTaskComment(taskId: string, content: string, parent_id?: string | null): Promise<CommentItem> {
  const payload: { content: string; parent_id?: string | null } = { content }
  if (parent_id) payload.parent_id = parent_id
  const { data } = await http.post(`/tasks/${taskId}/comments`, payload)
  return data
}

export async function addChecklist(taskId: string, content: string): Promise<ChecklistItem> {
  const { data } = await http.post(`/tasks/${taskId}/checklists`, { content })
  return data
}

export async function updateChecklist(itemId: string, payload: { content?: string; is_done?: boolean }): Promise<ChecklistItem> {
  const { data } = await http.patch(`/tasks/checklists/${itemId}`, payload)
  return data
}

export async function uploadAttachment(taskId: string, file: File): Promise<AttachmentItem> {
  const fd = new FormData()
  fd.append('file', file)
  const { data } = await http.post(`/tasks/${taskId}/attachments`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function requestExtension(taskId: string, proposed_deadline: string, reason: string): Promise<ExtensionRequest> {
  const { data } = await http.post(`/tasks/${taskId}/extension-requests`, {
    proposed_deadline,
    reason,
  })
  return data
}
