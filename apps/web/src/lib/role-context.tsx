"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { Role } from "./api";

const STORAGE_KEY = "techlio-dev-role";

const RoleContext = createContext<{
  role: Role;
  setRole: (r: Role) => void;
}>({ role: "manager", setRole: () => {} });

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>("manager");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Role | null;
    if (
      stored &&
      ["manager", "developer", "administrator", "auditor"].includes(stored)
    ) {
      setRoleState(stored);
    }
  }, []);

  const setRole = useCallback((r: Role) => {
    setRoleState(r);
    localStorage.setItem(STORAGE_KEY, r);
  }, []);

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
