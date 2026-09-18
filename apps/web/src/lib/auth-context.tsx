"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { API_BASE } from "./api";
import type { Role } from "./api";
import { homePathForRole } from "./permissions";

const TOKEN_KEY = "techlio-jwt";

export type PortalUser = {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  organizationId: string;
  developerId?: string | null;
};

type AuthState = {
  token: string | null;
  user: PortalUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  authHeaders: () => HeadersInit;
};

const AuthContext = createContext<AuthState>({
  token: null,
  user: null,
  ready: false,
  login: async () => {},
  logout: () => {},
  authHeaders: () => ({}),
});

const PUBLIC_PATHS = ["/login"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<PortalUser | null>(null);
  const [ready, setReady] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const applySession = useCallback((nextToken: string, nextUser: PortalUser) => {
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem(TOKEN_KEY, nextToken);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    router.push("/login");
  }, [router]);

  const login = useCallback(
    async (email: string, password: string) => {
      const r = await fetch(`${API_BASE}/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await r.json();
      if (!r.ok) {
        throw new Error(json.message ?? "Sign-in failed");
      }
      applySession(json.token, json.user);
      router.push(json.homePath ?? "/");
    },
    [applySession, router],
  );

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      setReady(true);
      return;
    }
    fetch(`${API_BASE}/v1/auth/me`, {
      headers: { Authorization: `Bearer ${stored}` },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("expired");
        const json = await r.json();
        setToken(stored);
        setUser(json.user);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    const isPublic = PUBLIC_PATHS.includes(pathname);
    if (!token && !isPublic) router.replace("/login");
    if (token && isPublic) router.replace(homePathForRole(user?.role));
  }, [ready, token, pathname, router, user?.role]);

  const value = useMemo<AuthState>(
    () => ({
      token,
      user,
      ready,
      login,
      logout,
      authHeaders: () => {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) headers.Authorization = `Bearer ${token}`;
        return headers;
      },
    }),
    [token, user, ready, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export function useRole(): Role {
  return useContext(AuthContext).user?.role ?? "manager";
}
