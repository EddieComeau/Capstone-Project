// server/routes/players.js

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const playersController = require('../controllers/playersController');

/**
 * POST /api/players/sync
 * Sync players from the Ball Don't Lie API.
 * 
 * Request Body:
 *  - per_page: (optional) Number of players per page (default: 25, max: 100)
 *  - team_ids: (optional) Array of team IDs to filter players by
 *  - activeOnly: (optional) Boolean to filter only active players
 * 
 * Response:
 *  - 200: Sync successful
 *  - 500: Internal server error
 */
router.post(
  '/sync',
  [
    body('per_page').optional().isInt({ min: 1, max: 100 }).withMessage('per_page must be an integer between 1 and 100'),
    body('team_ids').optional().isArray().withMessage('team_ids must be an array'),
  ],
  playersController.syncPlayers
);

module.exports = router;
