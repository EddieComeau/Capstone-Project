// frontend/src/components/WeekPicker.jsx

import useWeekPicker from "../hooks/useWeekPicker";

/**
 * A dropdown for selecting NFL weeks. Automatically calculates the
 * current week based on the provided seasonStart date. When a week is
 * selected, calls the optional onChange callback.
 *
 * @param {object} props
 * @param {string} props.seasonStart - Date string (e.g. "2025-09-05")
 * @param {(number) => void} [props.onChange] - Called with the new week
 * @param {number} [props.value] - Controlled selected value
 */
export default function WeekPicker({ seasonStart, onChange, value }) {
  const { week, setWeek, weeks } = useWeekPicker(seasonStart);

  const selected = value !== undefined ? value : week;

  function handleChange(e) {
    const w = Number(e.target.value);
    setWeek(w);
    if (onChange) onChange(w);
  }

  return (
    <select value={selected} onChange={handleChange}>
      {weeks.map((w) => (
        <option key={w} value={w}>
          Week {w}
        </option>
      ))}
    </select>
  );
}
