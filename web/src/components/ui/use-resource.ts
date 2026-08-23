"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ServiceError } from "@/services/query";

/**
 * Reads a service module from a client component.
 *
 * Every list page needs the same four things — data, a loading flag, a human-readable error and a way
 * to try again — so they live here once rather than being rebuilt with three `useState`s per page.
 *
 * Two details matter and are easy to get wrong:
 *
 *  - **Out-of-order responses.** Typing in a search box fires a request per keystroke. Without the
 *    request counter below, a slow early response can land after a fast later one and overwrite the
 *    newer results with stale rows. Only the most recent request is allowed to set state.
 *  - **Unmounted updates.** The same counter covers navigation away mid-request.
 *
 * `load` is expected to be wrapped in `useCallback` by the caller, or to close over values listed in
 * its own dependencies — this hook re-runs whenever the `load` identity changes.
 */
export type Resource<T> = {
  data: T | undefined;
  error: string | undefined;
  /** True on the first load and on every reload. */
  loading: boolean;
  /** True only before the first successful load, so a table can keep showing rows while refetching. */
  initialising: boolean;
  reload: () => void;
};

const GENERIC_MESSAGE = "Something went wrong while loading this section. Please try again.";

export function useResource<T>(load: () => Promise<T>): Resource<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [nonce, setNonce] = useState(0);

  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    setLoading(true);

    load()
      .then((result) => {
        if (id !== requestId.current) return;
        setData(result);
        setError(undefined);
        setLoaded(true);
      })
      .catch((cause: unknown) => {
        if (id !== requestId.current) return;
        // Only a ServiceError carries a message meant for a person. Anything else is a bug or a
        // transport failure, and its text is not something mosque staff should be shown.
        setError(cause instanceof ServiceError ? cause.message : GENERIC_MESSAGE);
      })
      .finally(() => {
        if (id !== requestId.current) return;
        setLoading(false);
      });
  }, [load, nonce]);

  const reload = useCallback(() => setNonce((current) => current + 1), []);

  return { data, error, loading, initialising: loading && !loaded, reload };
}

/**
 * Runs a create/update/delete and reports its progress.
 *
 * Kept separate from `useResource` because a mutation is triggered by a person rather than by a
 * render, and because the submit button needs a `pending` flag it can disable itself with — which is
 * what stops a double-click creating two records.
 */
export type Mutation<Input, Output> = {
  run: (input: Input) => Promise<Output | undefined>;
  pending: boolean;
  error: string | undefined;
  reset: () => void;
};

export function useMutation<Input, Output>(
  action: (input: Input) => Promise<Output>,
): Mutation<Input, Output> {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const run = useCallback(
    async (input: Input) => {
      setPending(true);
      setError(undefined);
      try {
        return await action(input);
      } catch (cause: unknown) {
        setError(cause instanceof ServiceError ? cause.message : GENERIC_MESSAGE);
        // Swallowed rather than rethrown: the caller checks the resolved value, and an unhandled
        // rejection from a click handler would surface as a console error with no owner.
        return undefined;
      } finally {
        setPending(false);
      }
    },
    [action],
  );

  const reset = useCallback(() => setError(undefined), []);

  return { run, pending, error, reset };
}
