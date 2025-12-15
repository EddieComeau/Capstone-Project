import { NavLink } from "react-router-dom";

export default function TopTabs() {
  const linkClass = ({ isActive }) => `tabBtn ${isActive ? "active" : ""}`;

  return (
    <header className="tabHeader">
      <div className="brand">
        <div className="brandMark" aria-hidden="true" />
        <div className="brandText">
          <div className="brandTitle">NFL Cards 4.0</div>
          <div className="brandSub">Home • Depth Chart • More</div>
        </div>
      </div>

      <nav className="tabs" aria-label="Primary">
        <NavLink to="/" className={linkClass} end>
          Home
        </NavLink>
        <NavLink to="/depth-chart" className={linkClass}>
          Depth Chart
        </NavLink>
        <NavLink to="/cards" className={linkClass}>
          Cards
        </NavLink>
        <NavLink to="/play-by-play" className={linkClass}>
          Play By Play
        </NavLink>
      </nav>
    </header>
  );
}
