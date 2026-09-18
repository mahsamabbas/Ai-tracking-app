"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, apiGet } from "./api";
import { useAuth } from "./auth-context";

export interface QueryState<T> {
  data: T | null;
  error: string | null;
  status: number | null;
  loading: boolean;
  refreshing: boolean;
  reload: () => void;
}

/**
 * Small fetch hook with the four states every screen must handle:
 * loading, error, empty (callers check the payload), and data.
 * `refreshing` distinguishes a background poll from a first paint.
 */
export function useApi<T>(
  path: string | null,
  options?: { pollMs?: number },
): QueryState<T> {
  const { token, ready } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nonce, setNonce] = useState(0);
  const hasData = useRef(false);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!ready || !token || !path) return;
    let cancelled = false;

    const run = async (background: boolean) => {
      if (background) setRefreshing(true);
      else if (!hasData.current) setLoading(true);
      try {
        const result = await apiGet<T>(path, token);
        if (cancelled) return;
        setData(result);
        hasData.current = true;
        setError(null);
        setStatus(200);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Request failed");
        setStatus(err instanceof ApiError ? err.status : null);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    void run(false);
    if (options?.pollMs) {
      const id = setInterval(() => void run(true), options.pollMs);
      return () => {
        cancelled = true;
        clearInterval(id);
      };
    }
    return () => {
      cancelled = true;
    };
  }, [path, token, ready, nonce, options?.pollMs]);

  useEffect(() => {
    hasData.current = false;
    setData(null);
  }, [path]);

  return { data, error, status, loading, refreshing, reload };
}
