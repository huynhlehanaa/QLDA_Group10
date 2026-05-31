import {
  fetchMe,
  login,
  logout,
  logoutAll,
  refreshToken,
  type TokenResponse,
  type UserProfile
} from '@/lib/auth';

type AuthState = {
  accessToken: string;
  refreshToken: string;
  sessionExpiresAt: string;
  me: UserProfile | null;
};

type AuthListener = () => void;

const ACCESS_TOKEN_KEY = 'kpi_access_token';
const REFRESH_TOKEN_KEY = 'kpi_refresh_token';
const SESSION_EXPIRES_AT_KEY = 'kpi_session_expires_at';

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
    sessionExpiresAt: readSession(SESSION_EXPIRES_AT_KEY),
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
    return this.signInWithTokens({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_type: data.token_type,
      session_expires_at: data.session_expires_at
    });
  },

  async signInWithTokens(tokenData: TokenResponse) {
    this.setState({
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      sessionExpiresAt: tokenData.session_expires_at || ''
    });
    writeSession(ACCESS_TOKEN_KEY, tokenData.access_token);
    writeSession(REFRESH_TOKEN_KEY, tokenData.refresh_token);
    writeSession(SESSION_EXPIRES_AT_KEY, tokenData.session_expires_at || '');
    this.setState({ me: await fetchMe(tokenData.access_token) });
    return this.state.me;
  },

  async bootstrap() {
    if (!this.state.accessToken) return null;
    if (this.state.sessionExpiresAt) {
      const expiresAt = new Date(this.state.sessionExpiresAt).getTime();
      if (Number.isFinite(expiresAt) && Date.now() >= expiresAt) {
        this.clear();
        return null;
      }
    }
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
        const resolvedSessionExpiresAt =
          tokenData.session_expires_at ||
          this.state.sessionExpiresAt ||
          new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
        this.setState({
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          sessionExpiresAt: resolvedSessionExpiresAt
        });
        writeSession(ACCESS_TOKEN_KEY, tokenData.access_token);
        writeSession(REFRESH_TOKEN_KEY, tokenData.refresh_token);
        writeSession(SESSION_EXPIRES_AT_KEY, resolvedSessionExpiresAt);
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

  async signOutAll() {
    if (this.state.accessToken) {
      try {
        await logoutAll(this.state.accessToken);
      } catch (error) {
        console.error('Logout-all request failed', error);
      }
    }
    this.clear();
  },

  clear() {
    this.setState({ accessToken: '', refreshToken: '', sessionExpiresAt: '', me: null });
    writeSession(ACCESS_TOKEN_KEY, '');
    writeSession(REFRESH_TOKEN_KEY, '');
    writeSession(SESSION_EXPIRES_AT_KEY, '');
  }
};
