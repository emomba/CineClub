const TOKEN_KEY = "cc_auth_token";
const USER_KEY = "cc_auth_user";
const SAVED_ACCOUNTS_KEY = "cc_saved_accounts_v2";
const LOGIN_HINT_KEY = "cc_login_hint";

export interface SavedAccount {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function setAuthUser(user: object): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function saveTokenForAccount(userId: string, token: string): void {
  localStorage.setItem(`cc_token_${userId}`, token);
}

export function getTokenForAccount(userId: string): string | null {
  return localStorage.getItem(`cc_token_${userId}`);
}

export function getSavedAccounts(): SavedAccount[] {
  try {
    const raw = localStorage.getItem(SAVED_ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAccount(account: SavedAccount): void {
  const accounts = getSavedAccounts().filter(a => a.id !== account.id);
  accounts.unshift(account);
  localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(accounts.slice(0, 5)));
}

export function setLoginHint(username: string): void {
  localStorage.setItem(LOGIN_HINT_KEY, username);
}

export function getAndClearLoginHint(): string | null {
  const hint = localStorage.getItem(LOGIN_HINT_KEY);
  if (hint) localStorage.removeItem(LOGIN_HINT_KEY);
  return hint;
}
