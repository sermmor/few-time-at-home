import { authStatusEndpoint, authLoginEndpoint, authLogoutEndpoint } from '../urls-and-end-points';

const TOKEN_KEY = 'ftah_auth_token';

export const getStoredToken = (): string | null => localStorage.getItem(TOKEN_KEY);
const setStoredToken  = (token: string) => localStorage.setItem(TOKEN_KEY, token);
const clearStoredToken = ()             => localStorage.removeItem(TOKEN_KEY);

const authHeaders = (): Record<string, string> => {
  const token = getStoredToken();
  return token ? { 'x-auth-token': token } : {};
};

export interface AuthStatus {
  loginEnabled:  boolean;
  authenticated: boolean;
}

const getStatus = (): Promise<AuthStatus> =>
  fetch(authStatusEndpoint(), { headers: authHeaders() })
    .then(r => r.json())
    .catch(() => ({ loginEnabled: false, authenticated: true }));

const login = (user: string, password: string): Promise<{ success: boolean }> =>
  fetch(authLoginEndpoint(), {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ user, password }),
  })
    .then(r => r.json())
    .then((data: { success: boolean; token?: string }) => {
      if (data.success && data.token) setStoredToken(data.token);
      return { success: data.success };
    })
    .catch(() => ({ success: false }));

const logout = (): Promise<void> =>
  fetch(authLogoutEndpoint(), { method: 'POST', headers: authHeaders() })
    .then(() => clearStoredToken())
    .catch(() => clearStoredToken());

export const AuthActions = { getStatus, login, logout };
