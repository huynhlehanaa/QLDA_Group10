// 🆕 Đổi import từ '../lib/auth' sang '../lib/api' 
// Ánh xạ hàm getProfile thành fetchMe để giữ nguyên logic gọi hàm ở dưới
import { getProfile as fetchMe, login, logoutCurrent as logout, refreshToken } from '../lib/api';
import type { UserProfile } from '../types/auth';

type AuthState = {
  accessToken: string;
  refreshToken: string;
  me: UserProfile | null;
};

type AuthListener = () => void;

const ACCESS_TOKEN_KEY = 'kpi_access_token';
const REFRESH_TOKEN_KEY = 'kpi_refresh_token';

function readSession(key: string): string {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem(key) || '';
}

function writeSession(key: string, value: string) {
  if (typeof window === 'undefined') return;
  if (value) sessionStorage.setItem(key, value);
  else sessionStorage.removeItem(key);
}

export const authStore = {
  state: {
    accessToken: readSession(ACCESS_TOKEN_KEY),
    refreshToken: readSession(REFRESH_TOKEN_KEY),
    me: null
  } as AuthState,
  listeners: new Set<AuthListener>(),

  setState(partial: Partial<AuthState>) {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((listener) => listener());
  },

  subscribe(listener: AuthListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  },

  getSnapshot() {
    return this.state;
  },

  async signIn(email: string, password: string) {
    const data = await login(email, password);
    this.setState({
      accessToken: data.access_token,
      refreshToken: data.refresh_token
    });
    writeSession(ACCESS_TOKEN_KEY, data.access_token);
    writeSession(REFRESH_TOKEN_KEY, data.refresh_token);
    
    // 🆕 Hàm fetchMe (getProfile) trong file api.ts đã tự dùng token từ instance http Axios, không cần truyền tham số
    const userProfile = await fetchMe();
    this.setState({ me: userProfile });
    return userProfile;
  },

  async bootstrap() {
    if (!this.state.accessToken) return null;
    try {
      // 🆕 Hàm fetchMe (getProfile) dùng token tự động từ cấu hình http Axios
      const userProfile = await fetchMe();
      this.setState({ me: userProfile });
      return userProfile;
    } catch {
      if (!this.state.refreshToken) {
        this.clear();
        return null;
      }
      try {
        const tokenData = await refreshToken(this.state.refreshToken);
        this.setState({
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token
        });
        writeSession(ACCESS_TOKEN_KEY, tokenData.access_token);
        writeSession(REFRESH_TOKEN_KEY, tokenData.refresh_token);
        
        // 🆕 Gọi fetchMe sau khi đã refresh token thành công
        const userProfile = await fetchMe();
        this.setState({ me: userProfile });
        return userProfile;
      } catch (error) {
        console.error('Token refresh failed', error);
        this.clear();
        return null;
      }
    }
  },

  async signOut() {
    if (this.state.refreshToken) {
      try {
        // 🆕 Hàm logout trong file api.ts nhận tham số là refreshToken để xóa session dưới DB backend
        await logout(this.state.refreshToken);
      } catch (error) {
        console.error('Logout request failed', error);
      }
    }
    this.clear();
  },

  clear() {
    this.setState({ accessToken: '', refreshToken: '', me: null });
    writeSession(ACCESS_TOKEN_KEY, '');
    writeSession(REFRESH_TOKEN_KEY, '');
  }
};