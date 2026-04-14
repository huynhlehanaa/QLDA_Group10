export type UserRole = "ceo" | "manager" | "staff";

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  role: UserRole;
  must_change_pw: boolean;
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  must_change_pw: boolean;
  dept_id?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  first_login_at?: string | null;
  created_at: string;
}
