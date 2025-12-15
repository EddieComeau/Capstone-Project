// client/src/pages/TeamCardsPage.jsx
import React, { useEffect, useState } from "react";
import {
  fetchTeamCards,
} from "../api/cardsApi";
import CardWrapper from "../components/cards/CardWrapper";
import SkillCard from "../components/cards/SkillCard";
import OLineCard from "../components/cards/OLineCard";
import OLineAdvancedCard from "../components/cards/OLineAdvancedCard";
import SpecialTeamsCard from "../components/cards/SpecialTeamsCard";
import DefenseCard from "../components/cards/DefenseCard";

function TeamCardsPage({ defaultTeam = "BUF", defaultSeason = 2024, defaultWeek = 1 }) {
  const [team, setTeam] = useState(defaultTeam);
  const [season, setSeason] = useState(defaultSeason);
  const [week, setWeek] = useState(defaultWeek);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [cards, setCards] = useState({
    skills: [],
    oline: [],
    olineAdvanced: [],
    specialTeams: [],
    defense: [],
  });

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchTeamCards(team, season, week);
        setCards({
          skills: data.skills || [],
          oline: data.oline || [],
          olineAdvanced: data.olineAdvanced || [],
          specialTeams: data.specialTeams || [],
          defense: data.defense || [],
        });
      } catch (err) {
        console.error("Failed to load team cards:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [team, season, week]);

  return (
    <div className="team-cards-page">
      <header className="tcp-header">
        <h1>NFL Cards 4.0</h1>
        <p>
          Depth chart cards powered by BALLDONTLIE NFL advanced stats.
        </p>

        <div className="tcp-controls">
          <label>
            Team
            <input
              value={team}
              onChange={(e) => setTeam(e.target.value.toUpperCase())}
              maxLength={3}
            />
          </label>
          <label>
            Season
            <input
              type="number"
              value={season}
              onChange={(e) => setSeason(Number(e.target.value))}
            />
          </label>
          <label>
            Week
            <input
              type="number"
              value={week}
              min={1}
              max={18}
              onChange={(e) => setWeek(Number(e.target.value))}
            />
          </label>
        </div>
      </header>

      {loading && <div className="tcp-status">Loading cards…</div>}
      {error && <div className="tcp-error">Error: {error}</div>}

      {!loading && !error && (
        <>
          {/* Skill positions */}
          <section className="tcp-row tcp-row-skill">
            <h2>Skill Positions</h2>
            <div className="tcp-row-grid">
              {cards.skills.map((card) => (
                <CardWrapper key={card.PlayerID || card.playerId}>
                  <SkillCard card={card} />
                </CardWrapper>
              ))}
            </div>
          </section>

          {/* Offensive line */}
          <section className="tcp-row tcp-row-oline">
            <h2>Offensive Line</h2>
            <div className="tcp-row-grid">
              {cards.oline.map((card) => (
                <CardWrapper key={card.PlayerID || card.playerId}>
                  <OLineCard card={card} />
                </CardWrapper>
              ))}
            </div>
          </section>

          {/* Advanced OL */}
          <section className="tcp-row tcp-row-oline-advanced">
            <h2>OL Advanced Metrics</h2>
            <div className="tcp-row-grid">
              {cards.olineAdvanced.map((card) => (
                <CardWrapper key={card.PlayerID || card.playerId}>
                  <OLineAdvancedCard card={card} />
                </CardWrapper>
              ))}
            </div>
          </section>

          {/* Defense */}
          <section className="tcp-row tcp-row-defense">
            <h2>Defense</h2>
            <div className="tcp-row-grid">
              {cards.defense.map((card) => (
                <CardWrapper key={card.PlayerID || card.playerId}>
                  <DefenseCard card={card} />
                </CardWrapper>
              ))}
            </div>
          </section>

          {/* Special Teams */}
          <section className="tcp-row tcp-row-special-teams">
            <h2>Special Teams</h2>
            <div className="tcp-row-grid">
              {cards.specialTeams.map((card) => (
                <CardWrapper key={card.PlayerID || card.playerId}>
                  <SpecialTeamsCard card={card} />
                </CardWrapper>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default TeamCardsPage;
