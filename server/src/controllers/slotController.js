const { pool } = require("../db/pool");

async function getSlotsByLocation(req, res) {
  const { locationId } = req.params;

  try {
    const result = await pool.query(
      `SELECT id, start_time, end_time, max_devices, location_id
       FROM wifi_slots
       WHERE location_id = $1
       ORDER BY start_time`,
      [locationId],
    );
    return res.status(200).json({ slots: result.rows });
  } catch (err) {
    console.error("Get slots error:", err.message);
    return res.status(500).json({ error: "Something went wrong." });
  }
}

async function getSlotAvailability(req, res) {
  const { slotId } = req.params;
  const { date } = req.query;

  if (!date) {
    return res
      .status(400)
      .json({ error: "A date query parameter is required." });
  }

  try {
    const slotResult = await pool.query(
      `SELECT s.id, s.start_time, s.end_time, s.max_devices, s.location_id,
              l.device_capacity
       FROM wifi_slots s
       JOIN locations l ON s.location_id = l.id
       WHERE s.id = $1`,
      [slotId],
    );

    if (slotResult.rows.length === 0) {
      return res.status(404).json({ error: "Slot not found." });
    }

    const slot = slotResult.rows[0];

    const slotSumResult = await pool.query(
      `SELECT COALESCE(SUM(device_count), 0) AS total
       FROM bookings
       WHERE slot_id = $1 AND booking_date = $2 AND status = 'confirmed'`,
      [slotId, date],
    );
    const slotUsed = parseInt(slotSumResult.rows[0].total, 10);

    const locationSumResult = await pool.query(
      `SELECT COALESCE(SUM(b.device_count), 0) AS total
       FROM bookings b
       JOIN wifi_slots s ON b.slot_id = s.id
       WHERE s.location_id = $1
         AND b.booking_date = $2
         AND b.status = 'confirmed'
         AND s.start_time < $3
         AND s.end_time > $4`,
      [slot.location_id, date, slot.end_time, slot.start_time],
    );
    const locationUsed = parseInt(locationSumResult.rows[0].total, 10);

    return res.status(200).json({
      slot_remaining: slot.max_devices - slotUsed,
      location_remaining: slot.device_capacity - locationUsed,
    });
  } catch (err) {
    console.error("Get availability error:", err.message);
    return res.status(500).json({ error: "Something went wrong." });
  }
}

async function getAllSlotsWithAvailability(req, res) {
  const today = new Date().toISOString().split("T")[0];

  try {
    const result = await pool.query(
      `SELECT s.id, s.start_time, s.end_time, s.max_devices, s.location_id,
              l.name AS location_name, l.device_capacity,
              COALESCE(booked.total, 0) AS booked_devices
       FROM wifi_slots s
       JOIN locations l ON s.location_id = l.id
       LEFT JOIN (
         SELECT slot_id, SUM(device_count) AS total
         FROM bookings
         WHERE booking_date = $1 AND status = 'confirmed'
         GROUP BY slot_id
       ) booked ON booked.slot_id = s.id
       ORDER BY l.name, s.start_time`,
      [today],
    );

    const slots = result.rows.map((row) => ({
      id: row.id,
      start_time: row.start_time,
      end_time: row.end_time,
      max_devices: row.max_devices,
      location_id: row.location_id,
      location_name: row.location_name,
      remaining: row.max_devices - parseInt(row.booked_devices, 10),
    }));

    return res.status(200).json({ slots });
  } catch (err) {
    console.error("Get all slots error:", err.message);
    return res.status(500).json({ error: "Something went wrong." });
  }
}

module.exports = {
  getSlotsByLocation,
  getSlotAvailability,
  getAllSlotsWithAvailability,
};
