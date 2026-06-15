import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { getAuthToken, saveAccount, saveTokenForAccount, getTokenForAccount, setAuthToken, setAuthUser, type SavedAccount } from "./auth-token";

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  signIn: (username: string, password: string, rememberMe?: boolean) => Promise<void>;
  signUp: (username: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => void;
  restoreSession: (account: SavedAccount) => Promise<boolean>;
}

const TOKEN_KEY = "cc_auth_token";
const USER_KEY = "cc_auth_user";

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setAuthTokenGetter(() => Promise.resolve(getAuthToken()));
    return () => setAuthTokenGetter(null);
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setIsLoaded(true);
      return;
    }
    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error("invalid token");
        return r.json();
      })
      .then((u: AuthUser) => {
        setUser(u);
        localStorage.setItem(USER_KEY, JSON.stringify(u));
        saveTokenForAccount(u.id, token);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
      })
      .finally(() => setIsLoaded(true));
  }, []);

  const signIn = useCallback(async (username: string, password: string, rememberMe = true) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Giriş başarısız");
    }
    const { token, user: u } = await res.json();
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    if (rememberMe) {
      saveAccount({ id: u.id, username: u.username, displayName: u.displayName, avatarUrl: u.avatarUrl });
      saveTokenForAccount(u.id, token);
    }
    flushSync(() => setUser(u));
  }, []);

  const signUp = useCallback(async (username: string, password: string, displayName?: string) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, displayName }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Kayıt başarısız");
    }
    const { token, user: u } = await res.json();
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    saveAccount({ id: u.id, username: u.username, displayName: u.displayName, avatarUrl: u.avatarUrl });
    saveTokenForAccount(u.id, token);
    flushSync(() => setUser(u));
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const restoreSession = useCallback(async (account: SavedAccount): Promise<boolean> => {
    const token = getTokenForAccount(account.id) ?? getAuthToken();
    if (!token) return false;
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return false;
      const u: AuthUser = await res.json();
      if (u.id !== account.id) return false;
      setAuthToken(token);
      setAuthUser(u);
      saveTokenForAccount(u.id, token);
      flushSync(() => setUser(u));
      return true;
    } catch {
      return false;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoaded,
        isSignedIn: !!user,
        signIn,
        signUp,
        signOut,
        restoreSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
