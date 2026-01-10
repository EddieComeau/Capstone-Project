// frontend/src/hooks/useWeekPicker.js

import { useState, useEffect } from "react";

/**
 * Custom hook to derive the current NFL week and provide a list of
 * possible weeks (1–23). Season start can be overridden (e.g. "2025-09-05").
 *
 * @param {string} seasonStart - Date string in YYYY-MM-DD format.
 * @returns {object} { week, setWeek, weeks }
 */
export default function useWeekPicker(seasonStart) {
  const [week, setWeek] = useState(1);

  useEffect(() => {
    const now = new Date();
    const start = new Date(seasonStart);
    if (now < start) {
      setWeek(1);
      return;
    }
    const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    const currentWeek = Math.floor(diffDays / 7) + 1;
    setWeek(Math.max(1, Math.min(currentWeek, 23)));
  }, [seasonStart]);

  // Weeks from 1 to 23 (playoffs included)
  const weeks = Array.from({ length: 23 }, (_, i) => i + 1);

  return { week, setWeek, weeks };
}
