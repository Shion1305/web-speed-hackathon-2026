import { useCallback, useEffect, useRef, useState } from "react";

import { consumePrefetchedJSON } from "@web-speed-hackathon-2026/client/src/utils/fetchers";

const LIMIT = 30;

function withPagination(apiPath: string, offset: number): string {
  const url = new URL(apiPath, window.location.origin);
  url.searchParams.set("limit", String(LIMIT));
  url.searchParams.set("offset", String(offset));
  return `${url.pathname}${url.search}`;
}

interface ReturnValues<T> {
  data: Array<T>;
  error: Error | null;
  isLoading: boolean;
  fetchMore: () => void;
}

export function useInfiniteFetch<T>(
  apiPath: string,
  fetcher: (apiPath: string) => Promise<T[]>,
): ReturnValues<T> {
  // Try consuming bootstrap data for the first page
  const bootstrapRef = useRef<T[] | null | undefined>(undefined);
  if (bootstrapRef.current === undefined) {
    if (apiPath === "") {
      bootstrapRef.current = null;
    } else {
      const url = withPagination(apiPath, 0);
      const cached = consumePrefetchedJSON<T[]>(url);
      bootstrapRef.current = cached ?? null;
    }
  }
  const initialData = bootstrapRef.current;

  const internalRef = useRef({
    hasMore: initialData ? initialData.length >= LIMIT : true,
    isLoading: false,
    offset: initialData ? initialData.length : 0,
  });

  const [result, setResult] = useState<Omit<ReturnValues<T>, "fetchMore">>({
    data: initialData ?? [],
    error: null,
    isLoading: initialData ? false : true,
  });

  const fetchMore = useCallback(() => {
    const { hasMore, isLoading, offset } = internalRef.current;
    if (isLoading || !hasMore || apiPath === "") {
      return;
    }

    setResult((cur) => ({
      ...cur,
      isLoading: true,
    }));
    internalRef.current = {
      hasMore,
      isLoading: true,
      offset,
    };

    void fetcher(withPagination(apiPath, offset)).then(
      (nextData) => {
        setResult((cur) => ({
          ...cur,
          data: [...cur.data, ...nextData],
          isLoading: false,
        }));
        internalRef.current = {
          hasMore: nextData.length >= LIMIT,
          isLoading: false,
          offset: offset + nextData.length,
        };
      },
      (error) => {
        setResult((cur) => ({
          ...cur,
          error,
          isLoading: false,
        }));
        internalRef.current = {
          hasMore,
          isLoading: false,
          offset,
        };
      },
    );
  }, [apiPath, fetcher]);

  useEffect(() => {
    // Skip initial fetch if we consumed bootstrap data
    if (initialData != null) {
      bootstrapRef.current = null;
      return;
    }

    setResult(() => ({
      data: [],
      error: null,
      isLoading: true,
    }));
    internalRef.current = {
      hasMore: true,
      isLoading: false,
      offset: 0,
    };

    if (apiPath !== "") {
      fetchMore();
    } else {
      setResult((cur) => ({
        ...cur,
        isLoading: false,
      }));
    }
  }, [fetchMore]);

  return {
    ...result,
    fetchMore,
  };
}
