// routes/auth.js
const express = require("express");
const { register, login, getMe } = require("../controllers/authController");
const { authRequired } = require("../middleware/authMiddleware");

const router = express.Router();

// @route POST /api/auth/register
router.post("/register", register);

// @route POST /api/auth/login
router.post("/login", login);

// @route GET /api/auth/me   (protected)
router.get("/me", authRequired, getMe);

module.exports = router;
