export type Role = 'ceo' | 'manager' | 'staff';

export interface UserItem {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  is_active: boolean;
  must_change_pw?: boolean;
  dept_id?: string | null;
  dept_name?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  first_login_at?: string | null;
  created_at: string;
}

export interface PaginatedUsers {
  items: UserItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface Department {
  id: string;
  name: string;
  description?: string | null;
  manager_id?: string | null;
  manager_name?: string | null;
  is_active: boolean;
  member_count: number;
  created_at: string;
}

export interface OrgChartNode {
  id: string;
  full_name: string;
  role: Role;
  avatar_url?: string | null;
  dept_name?: string | null;
  children: OrgChartNode[];
}

export interface DeptStatsItem {
  dept_id?: string;
  id?: string;
  dept_name?: string;
  name?: string;
  manager_count?: number;
  staff_count?: number;
  employee_count?: number;
  member_count?: number;
  active_count?: number;
}

export interface LoginLog {
  id: string;
  user_id?: string | null;
  email_attempted: string;
  ip_address?: string | null;
  user_agent?: string | null;
  success: boolean;
  created_at: string;
}

export interface LoginLogResult {
  total: number;
  page: number;
  items: LoginLog[];
}
