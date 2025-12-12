// server/routes/auth.js
const express = require("express");
const { register, login, getMe } = require("../controllers/authController");
const { authRequired } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authRequired, getMe);

module.exports = router;
