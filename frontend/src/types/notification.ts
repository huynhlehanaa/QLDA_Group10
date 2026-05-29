export interface NotificationItem {
  id: string
  type: string
  title: string
  body: string
  is_read: boolean
  created_at: string | null
}

export interface NotificationListResponse {
  total: number
  unread_count: number
  page: number
  page_size: number
  items: NotificationItem[]
}