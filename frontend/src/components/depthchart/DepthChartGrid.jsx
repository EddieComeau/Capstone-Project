// FRONTEND (React/Vite) — Grid layout for depth chart positions

import PlayerTileCard from "../cards/PlayerTileCard";
import "./DepthChartGrid.css";

const LAYOUTS = {
  offense: {
    gridClass: "dcgrid--offense",
    slots: [
      { id: "LT", label: "LT" },
      { id: "LG", label: "LG" },
      { id: "C", label: "C" },
      { id: "RG", label: "RG" },
      { id: "RT", label: "RT" },
      { id: "TE", label: "TE" },

      { id: "WR1", label: "WR1" },
      { id: "HB", label: "HB" },
      { id: "QB", label: "QB" },
      { id: "FB", label: "FB" },
      { id: "WR2", label: "WR2" },
    ],
  },

  defense: {
    gridClass: "dcgrid--defense",
    slots: [
      { id: "CB1", label: "CB1" },
      { id: "FS", label: "FS" },
      { id: "SS", label: "SS" },
      { id: "CB2", label: "CB2" },

      { id: "OLB", label: "LB" },
      { id: "MLB", label: "LB" },
      { id: "ILB", label: "LB" },

      { id: "DE1", label: "DL" },
      { id: "DT1", label: "DL" },
      { id: "DT2", label: "DL" },
      { id: "DE2", label: "DL" },
    ],
  },

  specialTeams: {
    gridClass: "dcgrid--st",
    slots: [
      { id: "K", label: "K" },
      { id: "P", label: "P" },
      { id: "LS", label: "LS" },
      { id: "KR", label: "KR" },
      { id: "PR", label: "PR" },
    ],
  },
};

function Slot({ slot, player, onSelect }) {
  return (
    <div className="dcslot" style={{ gridArea: slot.id }}>
      <div className="dcslot__label">{slot.label}</div>

      {player ? (
        <PlayerTileCard player={player} onSelect={onSelect} />
      ) : (
        <button className="dcslot__empty" type="button">
          + Add
        </button>
      )}
    </div>
  );
}

export default function DepthChartGrid({ mode, depthChart, onSelectPlayer }) {
  const layout = LAYOUTS[mode];
  if (!layout) return null;

  return (
    <div className={`dcgrid ${layout.gridClass}`}>
      {layout.slots.map((s) => (
        <Slot key={s.id} slot={s} player={depthChart?.[s.id]} onSelect={onSelectPlayer} />
      ))}
    </div>
  );
}
