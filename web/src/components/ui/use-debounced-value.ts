"use client";

import { useEffect, useState } from "react";

/**
 * The value, once it has stopped changing.
 *
 * A search box wired straight to a request sends one per keystroke: "donation" is eight requests, seven
 * of them already stale before they land. Debouncing the value the *query* is built from — rather than
 * the input the person is typing into — keeps the field responsive while the network sees one request
 * for the word.
 *
 * 350ms is the usual sweet spot: past the gap between keystrokes in ordinary typing, short enough that
 * results feel like a consequence of typing rather than of pausing.
 */
export function useDebouncedValue<T>(value: T, delay = 350): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    // Cleared on every change, which is what makes this a debounce and not a throttle: the timer only
    // ever fires after a quiet interval.
    return () => clearTimeout(timer);
  }, [value, delay]);

  return settled;
}
