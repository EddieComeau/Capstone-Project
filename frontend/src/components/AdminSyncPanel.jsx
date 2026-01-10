// frontend/src/components/AdminSyncPanel.jsx

import { useState } from "react";
import WeekPicker from "./WeekPicker";

export default function AdminSyncPanel() {
  const [season, setSeason] = useState(new Date().getFullYear().toString());
  const [week, setWeek] = useState(1);
  const [status, setStatus] = useState("");

  const handleSync = async () => {
    setStatus("Syncing...");
    try {
      const res = await fetch("/api/admin/sync-betting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ season: Number(season), week: Number(week) }),
      });
      const json = await res.json();
      if (res.ok) {
        setStatus(json.message || "Sync complete");
      } else {
        setStatus(json.error || "Sync failed");
      }
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
  };

  return (
    <div style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8 }}>
      <h3>Admin Sync Panel</h3>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          value={season}
          onChange={(e) => setSeason(e.target.value)}
          placeholder="Season (e.g. 2025)"
        />
        <WeekPicker
          seasonStart={`${season}-09-05`}
          value={week}
          onChange={setWeek}
        />
        <button onClick={handleSync}>🔄 Sync Betting Data</button>
      </div>
      {status && <p style={{ marginTop: 8 }}>{status}</p>}
    </div>
  );
}
