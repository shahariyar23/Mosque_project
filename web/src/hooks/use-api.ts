"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ServiceError } from "@/services/query";
import { useTenantRevision } from "@/services/tenantStore";

const GENERIC_MESSAGE = "Something went wrong while loading this section. Please try again.";

export type ResourceOptions = {
  enabled?: boolean;
};

export function useApiResource<T>(
  fetcher: () => Promise<T>,
  deps: any[],
  options?: ResourceOptions
) {
  const enabled = options?.enabled ?? true;
  const tenantRevision = useTenantRevision();

  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [dataRevision, setDataRevision] = useState<number | null>(null);

  const requestId = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const id = ++requestId.current;
    setLoading(true);

    fetcher()
      .then((result) => {
        if (id !== requestId.current) return;
        setData(result);
        setDataRevision(tenantRevision);
        setError(undefined);
      })
      .catch((cause: unknown) => {
        if (id !== requestId.current) return;
        setError(cause instanceof ServiceError ? cause.message : GENERIC_MESSAGE);
      })
      .finally(() => {
        if (id !== requestId.current) return;
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce, enabled, tenantRevision, ...deps]);

  const refetch = useCallback(() => setNonce((current) => current + 1), []);

  return { data: dataRevision === tenantRevision ? data : undefined, error, loading, refetch };
}

export type PageMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export function useApiList<T>(
  fetcher: (query: any) => Promise<{ rows: T[]; meta: PageMeta }>,
  query: any,
  options?: ResourceOptions
) {
  const enabled = options?.enabled ?? true;
  const tenantRevision = useTenantRevision();

  const [rows, setRows] = useState<T[]>([]);
  const [meta, setMeta] = useState<PageMeta | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [rowsRevision, setRowsRevision] = useState<number | null>(null);

  const requestId = useRef(0);

  // We serialize the query object so it can be safely used as a dependency without triggering deep equality checks
  const serializedQuery = JSON.stringify(query);

  useEffect(() => {
    if (!enabled) return;

    const id = ++requestId.current;
    setLoading(true);

    fetcher(JSON.parse(serializedQuery))
      .then((result) => {
        if (id !== requestId.current) return;
        setRows(result.rows);
        setMeta(result.meta);
        setRowsRevision(tenantRevision);
        setError(undefined);
      })
      .catch((cause: unknown) => {
        if (id !== requestId.current) return;
        setError(cause instanceof ServiceError ? cause.message : GENERIC_MESSAGE);
      })
      .finally(() => {
        if (id !== requestId.current) return;
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce, enabled, tenantRevision, fetcher, serializedQuery]);

  const refetch = useCallback(() => setNonce((current) => current + 1), []);

  return {
    rows: rowsRevision === tenantRevision ? rows : [],
    meta: rowsRevision === tenantRevision ? meta : undefined,
    error,
    loading,
    refetch,
  };
}
