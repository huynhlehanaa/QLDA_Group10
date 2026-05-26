import { fetchMe, login, logout, refreshToken, type UserProfile } from '@/lib/auth';

type AuthState = {
  accessToken: string;
  refreshToken: string;
  me: UserProfile | null;
};

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

  async signIn(email: string, password: string) {
    const data = await login(email, password);
    this.state.accessToken = data.access_token;
    this.state.refreshToken = data.refresh_token;
    writeSession(ACCESS_TOKEN_KEY, data.access_token);
    writeSession(REFRESH_TOKEN_KEY, data.refresh_token);
    this.state.me = await fetchMe(data.access_token);
    return this.state.me;
  },

  async bootstrap() {
    if (!this.state.accessToken) return null;
    try {
      this.state.me = await fetchMe(this.state.accessToken);
      return this.state.me;
    } catch {
      if (!this.state.refreshToken) {
        this.clear();
        return null;
      }
      const tokenData = await refreshToken(this.state.refreshToken);
      this.state.accessToken = tokenData.access_token;
      this.state.refreshToken = tokenData.refresh_token;
      writeSession(ACCESS_TOKEN_KEY, tokenData.access_token);
      writeSession(REFRESH_TOKEN_KEY, tokenData.refresh_token);
      this.state.me = await fetchMe(tokenData.access_token);
      return this.state.me;
    }
  },

  async signOut() {
    if (this.state.accessToken && this.state.refreshToken) {
      try {
        await logout(this.state.accessToken, this.state.refreshToken);
      } catch {
        // ignore logout failure
      }
    }
    this.clear();
  },

  clear() {
    this.state.accessToken = '';
    this.state.refreshToken = '';
    this.state.me = null;
    writeSession(ACCESS_TOKEN_KEY, '');
    writeSession(REFRESH_TOKEN_KEY, '');
  }
};
