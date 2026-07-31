const { pool } = require("../db/pool");

function validateLocationInput({ name, floor, device_capacity }) {
  const errors = [];
  if (!name || name.trim().length === 0)
    errors.push("Location name is required.");
  if (!floor || floor.trim().length === 0) errors.push("Floor is required.");
  if (!Number.isInteger(device_capacity) || device_capacity <= 0) {
    errors.push("device_capacity must be a positive integer.");
  }
  return errors;
}

async function createLocation(req, res) {
  const { name, floor, device_capacity } = req.body;
  const errors = validateLocationInput({ name, floor, device_capacity });
  if (errors.length > 0) return res.status(400).json({ errors });

  try {
    const result = await pool.query(
      `INSERT INTO locations (id, name, floor, device_capacity)
       VALUES (gen_random_uuid(), $1, $2, $3)
       RETURNING id, name, floor, device_capacity`,
      [name.trim(), floor.trim(), device_capacity],
    );
    return res.status(201).json({ location: result.rows[0] });
  } catch (err) {
    console.error("Create location error:", err.message);
    return res.status(500).json({ error: "Something went wrong." });
  }
}

async function deleteLocation(req, res) {
  const { id } = req.params;
  try {
    await pool.query(
      `UPDATE wifi_slots
   SET is_active = FALSE
   WHERE location_id = $1`,
      [id],
    );
    const result = await pool.query(
      `UPDATE locations
   SET is_active = FALSE
   WHERE id = $1
   RETURNING id`,
      [id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Location not found." });
    }
    return res.status(200).json({ message: "Location deleted." });
  } catch (err) {
    console.error("Delete location error:", err.message);
    return res
      .status(500)
      .json({ error: "Something went wrong. It may have active bookings." });
  }
}

function validateSlotInput({ start_time, end_time, max_devices, location_id }) {
  const errors = [];
  if (!start_time) errors.push("start_time is required.");
  if (!end_time) errors.push("end_time is required.");
  if (!Number.isInteger(max_devices) || max_devices <= 0) {
    errors.push("max_devices must be a positive integer.");
  }
  if (!location_id) errors.push("location_id is required.");
  return errors;
}

async function createSlot(req, res) {
  const { start_time, end_time, max_devices, location_id } = req.body;
  const errors = validateSlotInput({
    start_time,
    end_time,
    max_devices,
    location_id,
  });
  if (errors.length > 0) return res.status(400).json({ errors });

  try {
    const result = await pool.query(
      `INSERT INTO wifi_slots (id, start_time, end_time, max_devices, location_id)
       VALUES (gen_random_uuid(), $1, $2, $3, $4)
       RETURNING id, start_time, end_time, max_devices, location_id`,
      [start_time, end_time, max_devices, location_id],
    );
    return res.status(201).json({ slot: result.rows[0] });
  } catch (err) {
    console.error("Create slot error:", err.message);
    if (err.message.includes("chk_valid_time_range")) {
      return res
        .status(400)
        .json({ error: "end_time must be after start_time." });
    }
    if (err.message.includes("chk_max_duration")) {
      return res
        .status(400)
        .json({ error: "Slot duration cannot exceed 2 hours." });
    }
    return res.status(500).json({ error: "Something went wrong." });
  }
}

async function deleteSlot(req, res) {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE wifi_slots
       SET is_active = FALSE
       WHERE id = $1
       RETURNING id`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Slot not found.",
      });
    }

    return res.status(200).json({
      message: "Slot deactivated successfully.",
    });
  } catch (err) {
    console.error("Delete slot error:", err.message);

    return res.status(500).json({
      error: "Something went wrong.",
    });
  }
}

module.exports = { createLocation, deleteLocation, createSlot, deleteSlot };
