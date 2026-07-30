const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const requireStaff = require("../middleware/requireStaff");
const {
  createUser,
  getAllBookings,
} = require("../controllers/adminController");
const {
  createLocation,
  deleteLocation,
  createSlot,
  deleteSlot,
} = require("../controllers/adminLocationController");

const router = express.Router();

router.use(authMiddleware, requireStaff); // every route below requires staff

router.post("/users", createUser);
router.get("/bookings", getAllBookings);
router.post("/locations", createLocation);
router.delete("/locations/:id", deleteLocation);
router.post("/slots", createSlot);
router.delete("/slots/:id", deleteSlot);

module.exports = router;
