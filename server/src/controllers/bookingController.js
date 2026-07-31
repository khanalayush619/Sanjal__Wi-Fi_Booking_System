const { pool } = require("../db/pool");
const { generateAccessCode } = require("../utils/accessCode");
const { createHotspotUser } = require("../network/hotspot");

const crypto = require("crypto");

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function generateWifiPassword(length = 10) {
  return crypto
    .randomBytes(16)
    .toString("base64")
    .replace(/[^a-zA-Z0-9]/g, "")
    .substring(0, length);
}

function validateBookingInput({ slot_id, booking_date, device_count }) {
  const errors = [];

  if (!slot_id || !UUID_REGEX.test(slot_id)) {
    errors.push("A valid slot_id is required.");
  }

  if (!booking_date || isNaN(Date.parse(booking_date))) {
    errors.push("A valid booking_date is required.");
  }

  if (!Number.isInteger(device_count) || device_count <= 0) {
    errors.push("device_count must be a positive integer.");
  }

  return errors;
}

async function createBooking(req, res) {
  const { slot_id, booking_date, device_count } = req.body;
  const userId = req.user.id;

  const errors = validateBookingInput({
    slot_id,
    booking_date,
    device_count,
  });

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const slotResult = await client.query(
      `
      SELECT
        s.id,
        s.start_time,
        s.end_time,
        s.max_devices,
        s.location_id,
        l.device_capacity
      FROM wifi_slots s
      JOIN locations l
      ON s.location_id=l.id
      WHERE s.id=$1
      `,
      [slot_id],
    );

    if (slotResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        error: "Slot not found.",
      });
    }

    const slot = slotResult.rows[0];

    //---------------------------------------
    // Prevent booking past slots
    //---------------------------------------

    const today = new Date();
    const todayString = new Date().toLocaleDateString("en-CA");

    if (booking_date === todayString) {
      const now = new Date();

      const slotStart = new Date(`${booking_date}T${slot.start_time}`);
      const slotEnd = new Date(`${booking_date}T${slot.end_time}`);

      if (now >= slotEnd) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          error: "This slot has already ended.",
        });
      }

      if (now >= slotStart) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          error: "This slot has already started.",
        });
      }
    }

    //---------------------------------------
    // Prevent booking previous dates
    //---------------------------------------

    const requestedDate = new Date(booking_date);
    requestedDate.setHours(0, 0, 0, 0);

    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    if (requestedDate < currentDate) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        error: "Booking date cannot be in the past.",
      });
    }

    //---------------------------------------
    // Lock location row
    //---------------------------------------

    await client.query(
      `
      SELECT id
      FROM locations
      WHERE id=$1
      FOR UPDATE
      `,
      [slot.location_id],
    );
    //-------------------------------------------------
    // Slot capacity
    //-------------------------------------------------

    const slotSumResult = await client.query(
      `
      SELECT COALESCE(SUM(device_count),0) AS total
      FROM bookings
      WHERE slot_id=$1
      AND booking_date=$2
      AND status='confirmed'
      `,
      [slot_id, booking_date],
    );

    const slotUsed = Number(slotSumResult.rows[0].total);

    if (slotUsed + device_count > slot.max_devices) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        error: "This slot does not have enough capacity left.",
      });
    }

    //-------------------------------------------------
    // Location capacity
    //-------------------------------------------------

    const locationSumResult = await client.query(
      `
      SELECT COALESCE(SUM(b.device_count),0) AS total
      FROM bookings b
      JOIN wifi_slots s
      ON b.slot_id=s.id
      WHERE s.location_id=$1
      AND b.booking_date=$2
      AND b.status='confirmed'
      AND s.start_time < $3
      AND s.end_time > $4
      `,
      [slot.location_id, booking_date, slot.end_time, slot.start_time],
    );

    const locationUsed = Number(locationSumResult.rows[0].total);

    if (locationUsed + device_count > slot.device_capacity) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        error: "This location does not have enough capacity during this time.",
      });
    }

    //-------------------------------------------------
    // Create booking
    //-------------------------------------------------

    const codeValidFrom = `${booking_date} ${slot.start_time}`;
    const codeValidUntil = `${booking_date} ${slot.end_time}`;

    const accessCode = generateAccessCode();

    const insertResult = await client.query(
      `
      INSERT INTO bookings
      (
        access_code,
        booking_date,
        device_count,
        status,
        code_valid_from,
        code_valid_until,
        user_id,
        slot_id
      )
      VALUES
      (
        $1,
        $2,
        $3,
        'confirmed',
        $4,
        $5,
        $6,
        $7
      )
      RETURNING *
      `,
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

    const booking = insertResult.rows[0];

    //-------------------------------------------------
    // MikroTik account
    //-------------------------------------------------

    const hotspotUsername = "BK" + booking.id.replace(/-/g, "").substring(0, 8);

    const hotspotPassword = generateWifiPassword();

    try {
      await createHotspotUser(hotspotUsername, hotspotPassword, "default");

      await client.query(
        `
        UPDATE bookings
        SET hotspot_username=$1,
            hotspot_password=$2
        WHERE id=$3
        `,
        [hotspotUsername, hotspotPassword, booking.id],
      );

      booking.hotspot_username = hotspotUsername;
      booking.hotspot_password = hotspotPassword;
    } catch (err) {
      console.error("MikroTik Error:", err.message);

      booking.hotspot_error = true;
    }

    await client.query("COMMIT");

    return res.status(201).json({
      booking,
    });
  } catch (err) {
    await client.query("ROLLBACK");

    console.error("Create booking error:", err);

    return res.status(500).json({
      error: "Something went wrong while creating the booking.",
    });
  } finally {
    client.release();
  }
}

async function getMyBookings(req, res) {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `
      SELECT
        b.id,
        b.access_code,
        b.booking_date,
        b.device_count,
        b.status,
        b.code_valid_from,
        b.code_valid_until,
        b.hotspot_username,
        b.hotspot_password,
        s.start_time,
        s.end_time,
        l.name AS location_name
      FROM bookings b
      JOIN wifi_slots s
        ON b.slot_id = s.id
      JOIN locations l
        ON s.location_id = l.id
      WHERE b.user_id = $1
      ORDER BY b.booking_date DESC,
               s.start_time DESC
      `,
      [userId],
    );

    return res.status(200).json({
      bookings: result.rows,
    });
  } catch (err) {
    console.error("Get my bookings error:", err);

    return res.status(500).json({
      error: "Something went wrong.",
    });
  }
}

module.exports = {
  createBooking,
  getMyBookings,
};
