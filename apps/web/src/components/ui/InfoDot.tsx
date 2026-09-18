"use client";

import { useState } from "react";

/** Accessible inline explanation — keyboard focusable, no hover-only content. */
export function InfoDot({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={open ? "Hide explanation" : "Show explanation"}
        aria-expanded={open}
        className="flex h-4 w-4 items-center justify-center rounded-full border border-line text-[9px] font-bold text-ink-400 transition hover:border-brand-400 hover:text-brand-600"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onBlur={() => setOpen(false)}
      >
        i
      </button>
      {open ? (
        <span
          role="tooltip"
          className="absolute left-1/2 top-6 z-30 w-60 -translate-x-1/2 rounded-lg border border-line bg-card p-2.5 text-xs font-normal leading-relaxed text-ink-700 shadow-pop"
        >
          {text}
        </span>
      ) : null}
    </span>
  );
}
