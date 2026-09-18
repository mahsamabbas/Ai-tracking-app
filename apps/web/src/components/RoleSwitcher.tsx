"use client";

import { useRole } from "@/lib/role-context";
import type { Role } from "@/lib/api";

const ROLES: { id: Role; label: string }[] = [
  { id: "manager", label: "Manager" },
  { id: "developer", label: "Developer" },
  { id: "administrator", label: "Admin" },
  { id: "auditor", label: "Auditor" },
];

export function RoleSwitcher({ dark }: { dark?: boolean }) {
  const { role, setRole } = useRole();

  return (
    <label
      className={`flex flex-col gap-1 text-xs sm:flex-row sm:items-center ${dark ? "text-slate-300" : "text-slate-600"}`}
    >
      <span className="font-medium">View as</span>
      <select
        className={`min-h-[36px] rounded-lg border px-2 py-1.5 text-sm ${
          dark
            ? "border-slate-600 bg-slate-800 text-slate-100"
            : "border-slate-300 bg-white text-slate-800"
        }`}
        value={role}
        onChange={(e) => setRole(e.target.value as Role)}
        aria-label="Dashboard role"
      >
        {ROLES.map((r) => (
          <option key={r.id} value={r.id}>
            {r.label}
          </option>
        ))}
      </select>
    </label>
  );
}
