const express = require("express");
const {
  getSlotsByLocation,
  getSlotAvailability,
  getAllSlotsWithAvailability,
} = require("../controllers/slotController");

const router = express.Router();

router.get("/", getAllSlotsWithAvailability);
router.get("/location/:locationId", getSlotsByLocation);
router.get("/:slotId/availability", getSlotAvailability);

module.exports = router;
