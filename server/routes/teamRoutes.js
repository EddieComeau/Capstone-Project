const express = require('express');
const router = express.Router();
const Team = require('../models/Team');

/**
 * GET /api/teams
 * Returns all teams
 */
router.get('/', async (req, res) => {
  try {
    const teams = await Team.find().sort({ name: 1 });
    res.json(teams);
  } catch (err) {
    console.error('[teams] Failed to fetch teams:', err.message);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

/**
 * GET /api/teams/:id
 * Returns a single team by Mongo ID or abbreviation
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const team = await Team.findOne({
      $or: [
        { _id: id },
        { abbreviation: id.toUpperCase() }
      ]
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json(team);
  } catch (err) {
    console.error('[teams] Failed to fetch team:', err.message);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

module.exports = router;
