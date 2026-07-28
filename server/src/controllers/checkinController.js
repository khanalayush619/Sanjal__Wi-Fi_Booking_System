const { pool } = require("../db/pool");

function validateCheckinInput({ access_code, device_label }) {
  const errors = [];

  if (!access_code || typeof access_code !== "string") {
    errors.push("access_code is required.");
  }

  if (
    !device_label ||
    typeof device_label !== "string" ||
    device_label.trim().length === 0
  ) {
    errors.push("device_label is required.");
  }

  return errors;
}

async function createCheckin(req, res) {
  const { access_code, device_label } = req.body;
  const userId = req.user.id;

  const errors = validateCheckinInput({ access_code, device_label });
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Lock the booking row — serializes every check-in attempt against this booking
    const bookingResult = await client.query(
      `SELECT id, user_id, status, device_count, code_valid_from, code_valid_until
       FROM bookings
       WHERE access_code = $1
       FOR UPDATE`,
      [access_code],
    );

    if (bookingResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Invalid access code." });
    }

    const booking = bookingResult.rows[0];

    if (booking.user_id !== userId) {
      await client.query("ROLLBACK");
      return res
        .status(403)
        .json({ error: "This access code does not belong to you." });
    }

    if (booking.status !== "confirmed") {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "This booking is not active." });
    }

    const now = new Date();
    const validFrom = new Date(booking.code_valid_from);
    const validUntil = new Date(booking.code_valid_until);

    if (now < validFrom || now > validUntil) {
      await client.query("ROLLBACK");
      return res
        .status(409)
        .json({ error: "This access code is not valid at this time." });
    }

    // Has this exact device already checked in for this booking?
    const existingDeviceResult = await client.query(
      `SELECT id FROM checkins WHERE booking_id = $1 AND device_label = $2`,
      [booking.id, device_label.trim()],
    );

    if (existingDeviceResult.rows.length > 0) {
      await client.query("ROLLBACK");
      return res
        .status(409)
        .json({
          error: "This device has already checked in for this booking.",
        });
    }

    // Device-count check — how many devices have already checked in?
    const countResult = await client.query(
      `SELECT COUNT(*) AS total FROM checkins WHERE booking_id = $1`,
      [booking.id],
    );
    const checkedInCount = parseInt(countResult.rows[0].total, 10);

    if (checkedInCount >= booking.device_count) {
      await client.query("ROLLBACK");
      return res
        .status(409)
        .json({
          error:
            "All allowed devices for this booking have already checked in.",
        });
    }

    const insertResult = await client.query(
      `INSERT INTO checkins (id, checked_in_at, device_label, booking_id)
       VALUES (gen_random_uuid(), NOW(), $1, $2)
       RETURNING id, checked_in_at, device_label`,
      [device_label.trim(), booking.id],
    );

    await client.query("COMMIT");

    return res.status(201).json({
      checkin: insertResult.rows[0],
      code_valid_until: booking.code_valid_until,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Check-in error:", err.message);
    return res
      .status(500)
      .json({ error: "Something went wrong during check-in." });
  } finally {
    client.release();
  }
}

module.exports = { createCheckin };
