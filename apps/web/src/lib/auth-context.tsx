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
import { homePathForRole } from "./permissions";
import type { Role } from "./types";

const TOKEN_KEY = "techlio-jwt";
const PUBLIC_PATHS = ["/login"];

export interface PortalUser {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  organizationId: string;
  developerId?: string | null;
}

interface AuthState {
  token: string | null;
  user: PortalUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  token: null,
  user: null,
  ready: false,
  login: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<PortalUser | null>(null);
  const [ready, setReady] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* private mode */
    }
    router.push("/login");
  }, [router]);

  const login = useCallback(
    async (email: string, password: string) => {
      const r = await fetch(`${API_BASE}/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(json.message ?? "Sign-in failed");
      setToken(json.token);
      setUser(json.user);
      try {
        localStorage.setItem(TOKEN_KEY, json.token);
      } catch {
        /* private mode */
      }
      router.push(json.homePath ?? homePathForRole(json.user.role, json.user.developerId));
    },
    [router],
  );

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(TOKEN_KEY);
    } catch {
      stored = null;
    }
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
        try {
          localStorage.removeItem(TOKEN_KEY);
        } catch {
          /* ignore */
        }
      })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    const isPublic = PUBLIC_PATHS.includes(pathname);
    if (!token && !isPublic) router.replace("/login");
    if (token && isPublic) {
      router.replace(homePathForRole(user?.role, user?.developerId));
    }
  }, [ready, token, pathname, router, user?.role, user?.developerId]);

  const value = useMemo<AuthState>(
    () => ({ token, user, ready, login, logout }),
    [token, user, ready, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
