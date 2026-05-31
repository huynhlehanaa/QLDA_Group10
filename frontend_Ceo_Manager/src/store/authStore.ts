import { fetchMe, login, logout, refreshToken, type UserProfile } from '@/lib/auth';

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
    accessToken: readSession(ACCESS_TOKEN_KEY) || 'mock_access_token_123456',
    refreshToken: readSession(REFRESH_TOKEN_KEY) || 'mock_refresh_token_123456',
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
    // --- ĐOẠN ĐÈ MOCK DATA ĐĂNG NHẬP CHẠY DEMO ---
    let role: 'ceo' | 'manager' = 'manager';
    let name = 'Quản Lý Dự Án';

    if (email.includes('ceo')) {
      role = 'ceo';
      name = 'Tổng Giám Đốc (CEO)';
    }

    // Dùng ép kiểu "as any" ở cuối để bypass mọi lỗi kiểm tra thuộc tính của TypeScript
    const mockUser = {
      id: 'mock-id-9999',
      email: email,
      role: role,
      full_name: name,
      avatar_url: null,
      is_active: true
    } as any;

    this.setState({
      accessToken: 'mock_access_token_123456',
      refreshToken: 'mock_refresh_token_123456',
      me: mockUser
    });
    writeSession(ACCESS_TOKEN_KEY, 'mock_access_token_123456');
    writeSession(REFRESH_TOKEN_KEY, 'mock_refresh_token_123456');

    return mockUser;
    // --------------------------------------------
  },

  async bootstrap() {
    const token = this.state.accessToken;
    if (!token) return null;

    // Ép kiểu "as any" cho user trong hàm bootstrap để trang Dashboard không bị đá ra ngoài
    const mockUser = {
      id: 'mock-id-9999',
      email: 'manager@gmail.com',
      role: 'manager',
      full_name: 'Quản Lý Dự Án (Mock)',
      avatar_url: null,
      is_active: true
    } as any;
    
    this.setState({ me: mockUser });
    return mockUser;
  },

  async signOut() {
    if (this.state.accessToken && this.state.refreshToken) {
      try {
        await logout(this.state.accessToken, this.state.refreshToken);
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

/*import { fetchMe, login, logout, refreshToken, type UserProfile } from '@/lib/auth';

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
    this.setState({ me: await fetchMe(data.access_token) });
    return this.state.me;
  },

  async bootstrap() {
    if (!this.state.accessToken) return null;
    try {
      this.setState({ me: await fetchMe(this.state.accessToken) });
      return this.state.me;
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
        this.setState({ me: await fetchMe(tokenData.access_token) });
        return this.state.me;
      } catch (error) {
        console.error('Token refresh failed', error);
        this.clear();
        return null;
      }
    }
  },

  async signOut() {
    if (this.state.accessToken && this.state.refreshToken) {
      try {
        await logout(this.state.accessToken, this.state.refreshToken);
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
*/