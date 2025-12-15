// src/components/playbyplay/HelmetButton.jsx
import React from "react";
import { getTheme } from "../common/teamTheme";
import PixelBadge from "../common/PixelBadge";
import "./playbyplay.css";

export default function HelmetButton({ abbr, label, active, onClick }) {
  const theme = getTheme(abbr);

  return (
    <button
      className={`helmetBtn ${active ? "active" : ""}`}
      style={{ "--p": theme.primary, "--s": theme.secondary }}
      onClick={onClick}
      title={label}
      type="button"
    >
      <div className="helmetShape">
        <div className="helmetLogoWrap">
          <PixelBadge
            abbr={abbr}
            primary={theme.primary}
            secondary={theme.secondary}
            size={26}
          />
          <div className="helmetAbbr">{abbr}</div>
        </div>
      </div>
      <div className="helmetLabel">{label}</div>
    </button>
  );
}
