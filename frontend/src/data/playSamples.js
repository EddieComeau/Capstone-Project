// Sample games/plays so the play-by-play tab works without BALLDONTLIE keys
export const SAMPLE_GAMES = [
    {
      id: "demo-1",
      season: 2024,
      week: 1,
      home_team: { abbreviation: "SF", full_name: "San Francisco Gridirons" },
      visitor_team: { abbreviation: "KC", full_name: "Kansas City Clocks" },
      home_team_score: 27,
      visitor_team_score: 24,
    },
    {
      id: "demo-2",
      season: 2024,
      week: 1,
      home_team: { abbreviation: "NYJ", full_name: "New York Flight" },
      visitor_team: { abbreviation: "DAL", full_name: "Dallas Stars" },
      home_team_score: 17,
      visitor_team_score: 13,
    },
  ];
  
  export function sampleGames(season, week) {
    const filtered = SAMPLE_GAMES.filter((g) => g.season === season && g.week === week);
    if (filtered.length) return filtered;
    return SAMPLE_GAMES;
  }
  
  const SAMPLE_PLAYS_BY_GAME = {
    "demo-1": [
      {
        id: "p1",
        wallclock: new Date().toISOString(),
        short_text: "Kickoff returned 28 yards",
        start_down: 1,
        start_yard_line: 25,
        end_yard_line: 53,
        team: { abbreviation: "KC" },
      },
      {
        id: "p2",
        wallclock: new Date(Date.now() + 1000).toISOString(),
        short_text: "Pass to TE for 15 yards — first down",
        start_down: 2,
        start_yard_line: 53,
        end_yard_line: 68,
        end_down: 1,
        team: { abbreviation: "KC" },
      },
      {
        id: "p3",
        wallclock: new Date(Date.now() + 2000).toISOString(),
        short_text: "Interception by SF at the 40",
        start_down: 3,
        start_yard_line: 68,
        end_yard_line: 40,
        team: { abbreviation: "SF" },
        text: "interception returned to the 40",
      },
      {
        id: "p4",
        wallclock: new Date(Date.now() + 3000).toISOString(),
        short_text: "Rushing touchdown up the middle",
        start_down: 1,
        start_yard_line: 12,
        end_yard_line: 0,
        scoring_play: true,
        team: { abbreviation: "SF" },
        text: "touchdown",
      },
      {
        id: "p5",
        wallclock: new Date(Date.now() + 4000).toISOString(),
        short_text: "Penalty on SF – defensive holding",
        start_down: 1,
        start_yard_line: 25,
        end_yard_line: 30,
        team: { abbreviation: "KC" },
        text: "penalty defensive holding",
      },
      {
        id: "p6",
        wallclock: new Date(Date.now() + 5000).toISOString(),
        short_text: "Fumble forced and recovered by SF",
        start_down: 2,
        start_yard_line: 42,
        end_yard_line: 38,
        team: { abbreviation: "SF" },
        text: "fumble recovered by SF",
      },
      {
        id: "p7",
        wallclock: new Date(Date.now() + 6000).toISOString(),
        short_text: "Field goal is good from 43 yards",
        start_down: 4,
        start_yard_line: 26,
        end_yard_line: 0,
        team: { abbreviation: "SF" },
        text: "field goal",
      },
    ],
    "demo-2": [
      {
        id: "d2p1",
        wallclock: new Date().toISOString(),
        short_text: "Slant to WR for 12 yards — first down",
        start_down: 1,
        start_yard_line: 20,
        end_yard_line: 32,
        end_down: 1,
        team: { abbreviation: "DAL" },
        text: "first down",
      },
      {
        id: "d2p2",
        wallclock: new Date(Date.now() + 1200).toISOString(),
        short_text: "Deep shot picked by NYJ at midfield",
        start_down: 2,
        start_yard_line: 32,
        end_yard_line: 50,
        team: { abbreviation: "NYJ" },
        text: "interception",
      },
      {
        id: "d2p3",
        wallclock: new Date(Date.now() + 2400).toISOString(),
        short_text: "Crossing route TD from 22 yards",
        start_down: 1,
        start_yard_line: 22,
        end_yard_line: 0,
        scoring_play: true,
        team: { abbreviation: "NYJ" },
        text: "touchdown",
      },
      {
        id: "d2p4",
        wallclock: new Date(Date.now() + 3600).toISOString(),
        short_text: "QB sneak stopped — turnover on downs",
        start_down: 4,
        start_yard_line: 48,
        end_yard_line: 47,
        team: { abbreviation: "DAL" },
        text: "turnover on downs",
      },
    ],
  };
  
  export function samplePlays(gameId) {
    return SAMPLE_PLAYS_BY_GAME[gameId] || [];
  }