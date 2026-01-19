// controllers/playByPlayController.js
const Play = require("../models/Play");

function toPlayResponse(play) {
  const raw = play.data || {};
  const team =
    raw.team ||
    (play.offense ? { abbreviation: play.offense } : null) ||
    (raw.offense_team ? { abbreviation: raw.offense_team } : null);
  const shortText = raw.short_text || raw.text || play.description || "";
  const text = raw.text || play.description || raw.short_text || "";

  return {
    id: raw.id ?? play.externalId ?? play._id?.toString(),
    game_id: play.gameId,
    wallclock: raw.wallclock || raw.created_at || play.createdAt || null,
    short_text: shortText,
    text,
    scoring_play: raw.scoring_play ?? raw.is_scoring_play ?? false,
    start_down: raw.start_down ?? play.down ?? null,
    end_down: raw.end_down ?? raw.down ?? play.down ?? null,
    start_yard_line: raw.start_yard_line ?? raw.yard_line ?? null,
    end_yard_line: raw.end_yard_line ?? raw.yard_line ?? null,
    team,
    clock_display: raw.clock_display || raw.clock || play.timeRemaining || null,
    period: raw.period ?? raw.quarter ?? play.quarter ?? null,
    end_short_down_distance_text:
      raw.end_short_down_distance_text || raw.short_down_distance_text || null,
  };
}

async function getPlayByPlay(req, res) {
  try {
    const { gameId, cursor, per_page } = req.query;

    if (!gameId) {
      return res.status(400).json({ error: "gameId is required" });
    }

    const gameIdNum = Number(gameId);
    if (Number.isNaN(gameIdNum)) {
      return res.status(400).json({ error: "gameId must be a number" });
    }

    const limit = per_page != null ? Number(per_page) : 100;
    const cursorNum = cursor != null ? Number(cursor) : null;
    const query = { gameId: gameIdNum };
    if (cursorNum != null && !Number.isNaN(cursorNum)) {
      query.sequence = { $gt: cursorNum };
    }

    const plays = await Play.find(query)
      .sort({ sequence: 1, _id: 1 })
      .limit(limit)
      .lean();

    const data = plays.map(toPlayResponse);
    const nextCursor =
      plays.length === limit ? plays[plays.length - 1].sequence ?? null : null;

    res.json({ data, meta: { next_cursor: nextCursor } });
  } catch (err) {
    console.error("playByPlay error:", err && err.message ? err.message : err);
    res.status(500).json({
      error: "Failed to fetch play-by-play",
    });
  }
}

module.exports = { getPlayByPlay };
