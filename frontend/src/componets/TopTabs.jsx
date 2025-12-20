import { NavLink, useNavigate } from "react-router-dom";

export default function TopTabs() {
  const navigate = useNavigate();
  const linkClass = ({ isActive }) => `tabBtn ${isActive ? "active" : ""}`;

  return (
    <header className="tabHeader">
      <div className="brand">
        <div className="brandMark" aria-hidden="true" />
        <div className="brandText">
          <div className="brandTitle">Sideline Studio</div>
          <div className="brandSub">Pro Football Companion</div>
        </div>
      </div>

      <nav className="tabs" aria-label="Primary">
        <NavLink to="/" className={linkClass} end>
          Start Screen
        </NavLink>
        <NavLink to="/home" className={linkClass}>
          Home
        </NavLink>
        <NavLink to="/depth-chart" className={linkClass}>
          Depth Chart
        </NavLink>
        <NavLink to="/matchups" className={linkClass}>
          Matchups
        </NavLink>
        <NavLink to="/standings" className={linkClass}>
          Standings
        </NavLink>
        <NavLink to="/betting" className={linkClass}>
          Betting
        </NavLink>
        <NavLink to="/injuries" className={linkClass}>
          Injuries
        </NavLink>
        <NavLink to="/cards" className={linkClass}>
          Cards
        </NavLink>
        <button className="tabBtn tabCta" type="button" onClick={() => navigate("/play-by-play")}>
          Play By Play
        </button>
      </nav>
    </header>
  );
}