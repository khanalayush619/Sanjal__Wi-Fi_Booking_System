const { pool } = require("../db/pool");
const { generateAccessCode } = require("../utils/accessCode");

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateBookingInput({ slot_id, booking_date, device_count }) {
  const errors = [];

  if (!slot_id || !UUID_REGEX.test(slot_id)) {
    errors.push("A valid slot_id is required.");
  }

  if (!booking_date || isNaN(Date.parse(booking_date))) {
    errors.push("A valid booking_date is required.");
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const requested = new Date(booking_date);
    if (requested < today) {
      errors.push("booking_date cannot be in the past.");
    }
  }

  if (!Number.isInteger(device_count) || device_count <= 0) {
    errors.push("device_count must be a positive integer.");
  }

  return errors;
}

async function createBooking(req, res) {
  const { slot_id, booking_date, device_count } = req.body;
  const userId = req.user.id; // from authMiddleware

  const errors = validateBookingInput({ slot_id, booking_date, device_count });
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Fetch slot + its location's capacity (plain read, not locked yet)
    const slotResult = await client.query(
      `SELECT s.id, s.start_time, s.end_time, s.max_devices, s.location_id,
              l.device_capacity
       FROM wifi_slots s
       JOIN locations l ON s.location_id = l.id
       WHERE s.id = $1`,
      [slot_id],
    );

    if (slotResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Slot not found." });
    }

    const slot = slotResult.rows[0];

    // Lock the location row — serializes every booking attempt for this location
    await client.query("SELECT id FROM locations WHERE id = $1 FOR UPDATE", [
      slot.location_id,
    ]);

    // Slot-level check
    const slotSumResult = await client.query(
      `SELECT COALESCE(SUM(device_count), 0) AS total
       FROM bookings
       WHERE slot_id = $1 AND booking_date = $2 AND status = 'confirmed'`,
      [slot_id, booking_date],
    );
    const slotUsed = parseInt(slotSumResult.rows[0].total, 10);

    if (slotUsed + device_count > slot.max_devices) {
      await client.query("ROLLBACK");
      return res
        .status(409)
        .json({ error: "This slot does not have enough capacity left." });
    }

    // Location-level check (overlapping slots only)
    const locationSumResult = await client.query(
      `SELECT COALESCE(SUM(b.device_count), 0) AS total
       FROM bookings b
       JOIN wifi_slots s ON b.slot_id = s.id
       WHERE s.location_id = $1
         AND b.booking_date = $2
         AND b.status = 'confirmed'
         AND s.start_time < $3
         AND s.end_time > $4`,
      [slot.location_id, booking_date, slot.end_time, slot.start_time],
    );
    const locationUsed = parseInt(locationSumResult.rows[0].total, 10);

    if (locationUsed + device_count > slot.device_capacity) {
      await client.query("ROLLBACK");
      return res
        .status(409)
        .json({
          error:
            "This location does not have enough capacity left at that time.",
        });
    }

    // Build code validity window from booking_date + slot's time-of-day
    const codeValidFrom = `${booking_date} ${slot.start_time}`;
    const codeValidUntil = `${booking_date} ${slot.end_time}`;
    const accessCode = generateAccessCode();

    const insertResult = await client.query(
      `INSERT INTO bookings
        (access_code, booking_date, device_count, status, code_valid_from, code_valid_until, user_id, slot_id)
       VALUES ($1, $2, $3, 'confirmed', $4, $5, $6, $7)
       RETURNING id, access_code, booking_date, device_count, status, code_valid_from, code_valid_until`,
      [
        accessCode,
        booking_date,
        device_count,
        codeValidFrom,
        codeValidUntil,
        userId,
        slot_id,
      ],
    );

    await client.query("COMMIT");

    return res.status(201).json({ booking: insertResult.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Create booking error:", err.message);
    return res
      .status(500)
      .json({ error: "Something went wrong while creating the booking." });
  } finally {
    client.release();
  }
}

module.exports = { createBooking };
