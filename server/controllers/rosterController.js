// server/controllers/rosterController.js

const Player = require('../models/Player');

/**
 * GET /api/roster/:abbr
 *
 * Returns the roster (players) for a given team abbreviation.  The
 * abbreviation is caseâ€‘insensitive.  Results are sorted by position and
 * player last name.  If no players are found, an empty array is returned.
 */
async function getRosterByTeam(req, res) {
  try {
    const abbr = (req.params.abbr || '').toUpperCase();
    if (!abbr) {
      return res.status(400).json({ error: 'Team abbreviation is required' });
    }
    // Query players whose nested team.abbreviation matches
    const players = await Player.find({ 'team.abbreviation': abbr }).sort({ position: 1, last_name: 1 });
    res.json(players);
  } catch (err) {
    console.error('Error fetching roster:', err && err.message ? err.message : err);
    res.status(500).json({ error: 'Failed to fetch roster' });
  }
}

module.exports = {
  getRosterByTeam,
};