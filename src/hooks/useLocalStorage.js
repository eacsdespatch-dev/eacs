/* ═══════════════════════════════════════════════════════════
 * useLocalStorage Hook
 * Syncs state with localStorage
 * ═══════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from "react";

export function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });

  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);

  return [value, setValue];
}

export default useLocalStorage;
