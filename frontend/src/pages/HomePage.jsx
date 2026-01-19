import React from "react";
import { useNavigate } from "react-router-dom";
import "./HomePage.css";

/**
 * Home page with toggles between Kenney sprite field and a Lottie animation.
 *
 * This component showcases a hero section that can display animated Kenney
 * football sprites or a looping American football Lottie animation.  A user
 * can toggle between modes via the buttons in the interface.  By default,
 * the mode is read from `VITE_HOME_BG_MODE` or falls back to "kenney".
 */
export default function HomePage() {
  const navigate = useNavigate();

  return (
    <section className="homeWrap">
      <div className="homeBackdrop" aria-hidden="true" />
      <div className="homeContent">
        <div className="homeHero">
          <div className="pill">HOME</div>
          <h1 className="homeTitle">Sideline Studio</h1>
          <p className="homeText">
            Pro football companion with fast navigation, player stats, comparisons, and weekly insights.
          </p>

          <div className="homeCtas">
            <button className="primaryBtn" onClick={() => navigate("/depth-chart")} type="button">
              Go to Depth Chart
            </button>
            <button className="ghostBtn" onClick={() => navigate("/cards")} type="button">
              Go to Cards
            </button>
            <button className="primaryBtn alt" onClick={() => navigate("/play-by-play")} type="button">
              Play-by-Play
            </button>
          </div>

          <div className="homeCtas">
            <button className="ghostBtn" onClick={() => navigate("/start")} type="button">
              Start Screen
            </button>
            <button className="ghostBtn" onClick={() => navigate("/home")} type="button">
              Home
            </button>
            <button className="ghostBtn" onClick={() => navigate("/matchups")} type="button">
              Matchups
            </button>
            <button className="ghostBtn" onClick={() => navigate("/standings")} type="button">
              Standings
            </button>
            <button className="ghostBtn" onClick={() => navigate("/cards")} type="button">
              Cards
            </button>
            <button className="ghostBtn" onClick={() => navigate("/play-by-play")} type="button">
              Play By Play
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
