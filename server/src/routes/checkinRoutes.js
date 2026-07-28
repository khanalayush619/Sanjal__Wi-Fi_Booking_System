const express = require("express");
const { createCheckin } = require("../controllers/checkinController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();
router.post("/", authMiddleware, createCheckin);

module.exports = router;
