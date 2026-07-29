const express = require("express");
const {
  createBooking,
  getMyBookings,
} = require("../controllers/bookingController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", authMiddleware, createBooking);
router.get("/mine", authMiddleware, getMyBookings);

module.exports = router;
