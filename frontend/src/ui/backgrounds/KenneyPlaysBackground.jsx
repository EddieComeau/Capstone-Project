import PlayRoutesOverlay from "../overlays/PlayRoutesOverlay";

/**
 * Kenney sprite-based background for play diagrams.  This component draws
 * a retro football field using Kenney art sprites loaded from `/kenney/*` in
 * the public directory.  It supports drawing players at arbitrary positions
 * with customizable team colors.  If a player object includes a `color` property
 * (e.g. passed from HomePage), that color will be used for the helmet and
 * uniform; otherwise it falls back to blue/red for home/away helmets and
 * lightblue/pink for uniforms.
 */
export default function KenneyPlaysBackground({
  highlightYardLines = [],
  routes = [],
  dots = [],
  players = [], // Default formation
  football = { cx: 50, cy: 25 }, // Default football position
  downMarker = { cx: 40, cy: 25 }, // Down marker position
  conversionMarker = { cx: 60, cy: 25 }, // Conversion marker position
  penalty = false, // Trigger penalty animation
  onHelmetClick = () => {}, // Callback for helmet button clicks
}) {
  return (
    <div
      className="kenneyBg"
      style={{
        backgroundImage: "url('/kenney/football_field.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Helmet Buttons */}
      <div className="helmetButtons">
        <button className="helmetButton home" onClick={() => onHelmetClick("home")}>
          <img src="/kenney/helmet_home.svg" alt="Home Helmet" />
        </button>
        <button className="helmetButton away" onClick={() => onHelmetClick("away")}>
          <img src="/kenney/helmet_away.svg" alt="Away Helmet" />
        </button>
      </div>

      <svg
        className="kenneySvg"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 50"
        preserveAspectRatio="none"
      >
        {/* Yard Lines */}
        {highlightYardLines.map((yard) => (
          <line
            key={yard}
            x1={yard}
            y1="0"
            x2={yard}
            y2="50"
            stroke="yellow"
            strokeWidth="0.5"
          />
        ))}

        {/* Players */}
        {players.map((player, index) => (
          <g key={`player-${index}`} transform={`translate(${player.cx}, ${player.cy})`}>
            {/* Helmet: support custom helmet asset via player.helmet and color override */}
            <use
              href={player.helmet || "/kenney/charactersEquipment.svg#helmet"}
              fill={player.color || (player.team === "home" ? "blue" : "red")}
              width="4"
              height="4"
              x="-2"
              y="-2"
            />
            {/* Uniform */}
            <use
              href="/kenney/charactersEquipment.svg#uniform"
              fill={player.color || (player.team === "home" ? "lightblue" : "pink")}
              width="4"
              height="4"
              x="-2"
              y="-2"
            />
          </g>
        ))}

        {/* Football */}
        <use
          className="football"
          href="/kenney/charactersEquipment.svg#football"
          x={football.cx - 1}
          y={football.cy - 1}
          width="2"
          height="2"
        />

        {/* Down Marker */}
        <circle
          className="downMarker"
          cx={downMarker.cx}
          cy={downMarker.cy}
          r={1.5}
          fill="orange"
        />

        {/* Conversion Marker */}
        <circle
          className="conversionMarker"
          cx={conversionMarker.cx}
          cy={conversionMarker.cy}
          r={1.5}
          fill="green"
        />

        {/* Referees */}
        <g className={`ref ${penalty ? "penalty" : ""}`} transform="translate(45, 20)">
          <rect x="-1" y="0" width="2" height="5" fill="black" /> {/* Body */}
          <line
            className="ref-arm"
            x1="0"
            y1="1"
            x2="-2"
            y2="-2"
            stroke="black"
            strokeWidth="0.5"
          /> {/* Left Arm */}
          <line
            className="ref-arm"
            x1="0"
            y1="1"
            x2="2"
            y2="-2"
            stroke="black"
            strokeWidth="0.5"
          /> {/* Right Arm */}
        </g>
      </svg>

      {/* Overlay for Play Routes */}
      <PlayRoutesOverlay routes={routes} dots={dots} />
    </div>
  );
}
