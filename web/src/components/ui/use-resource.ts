"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ServiceError, type FieldErrors } from "@/services/query";

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

/**
 * `enabled: false` means **no request is made at all** — not a request whose result is discarded.
 *
 * That distinction is the point of the option. A page the visitor lacks the permission for must not ask
 * for the data: the server would refuse it anyway, and a 403 in the network log for every gated section
 * of the dashboard buries the ones that matter. It is also how a dependent read waits for its id.
 */
export type ResourceOptions = {
  enabled?: boolean;
};

export function useResource<T>(load: () => Promise<T>, options?: ResourceOptions): Resource<T> {
  const enabled = options?.enabled ?? true;

  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);
  const [nonce, setNonce] = useState(0);

  /**
   * Which request the state below describes, or `null` before the first one settles.
   *
   * A request is identified by the `load` identity it was made with plus the reload counter, both of
   * which are in scope during render — which is the point. `loading` is then *derived* from comparing
   * that against the request the current render wants, so nothing has to set a flag when a request
   * starts. Storing one instead would mean a `setLoading(true)` in the effect body, i.e. a render that
   * immediately schedules another render, which is what `react-hooks/set-state-in-effect` is about.
   *
   * It also gets three edge cases right for free: a new search term reads as loading in the same render
   * that changes it rather than one render later; closing the gate needs no state update at all; and a
   * request abandoned mid-flight never marks itself settled, so the next one is still awaited.
   */
  const [settled, setSettled] = useState<{ load: () => Promise<T>; nonce: number } | null>(null);

  const requestId = useRef(0);

  const loading = enabled && (settled === null || settled.load !== load || settled.nonce !== nonce);

  useEffect(() => {
    if (!enabled) {
      // Bumped so a response from a request in flight when the gate closed cannot land afterwards.
      requestId.current += 1;
      return;
    }

    const id = ++requestId.current;

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
        setSettled({ load, nonce });
      });
  }, [load, nonce, enabled]);

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
export type MutationResult<Output> =
  | { ok: true; data: Output }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

export type Mutation<Input, Output> = {
  /**
   * Resolves with an explicit outcome rather than throwing.
   *
   * A tagged result and not `Output | undefined`, because a delete resolves with nothing on success and
   * "undefined" would then mean both "done" and "failed" — the caller closes the dialog either way. The
   * `error` state below is for rendering; this is what the click handler branches on, since state read
   * straight after an `await` is still the previous render's value.
   */
  run: (input: Input) => Promise<MutationResult<Output>>;
  pending: boolean;
  error: string | undefined;
  /** Per-field messages from a 400, ready to sit under the inputs that caused them. */
  fieldErrors: FieldErrors | undefined;
  reset: () => void;
};

export function useMutation<Input, Output>(
  action: (input: Input) => Promise<Output>,
): Mutation<Input, Output> {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors | undefined>(undefined);

  // Held in a ref so `run` keeps one identity for the life of the component. Callers write the action
  // inline — `(input) => createUser(input)` — and without this every render would produce a new `run`,
  // which is a trap for anything that lists it as a dependency.
  //
  // Written in an effect rather than during render: a ref is not render output, and assigning one while
  // rendering breaks under a re-render React throws away. An effect runs before any click can reach
  // `run`, and `useRef(action)` covers the first render until it does.
  const latest = useRef(action);
  useEffect(() => {
    latest.current = action;
  }, [action]);

  const run = useCallback(async (input: Input): Promise<MutationResult<Output>> => {
    setPending(true);
    setError(undefined);
    setFieldErrors(undefined);

    try {
      return { ok: true, data: await latest.current(input) };
    } catch (cause: unknown) {
      const message = cause instanceof ServiceError ? cause.message : GENERIC_MESSAGE;
      const fields = cause instanceof ServiceError ? cause.fieldErrors : undefined;

      setError(message);
      setFieldErrors(fields);

      // Not rethrown: the caller reads the returned outcome, and an unhandled rejection from a click
      // handler would surface as a console error with no owner.
      return { ok: false, error: message, fieldErrors: fields };
    } finally {
      setPending(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(undefined);
    setFieldErrors(undefined);
  }, []);

  return { run, pending, error, fieldErrors, reset };
}
