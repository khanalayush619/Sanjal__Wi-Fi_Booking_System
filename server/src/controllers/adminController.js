const bcrypt = require("bcrypt");
const { pool } = require("../db/pool");

const SALT_ROUNDS = 10;
const VALID_ROLES = ["student", "professor", "staff"];

function validateCreateUserInput({ name, email, password, role }) {
  const errors = [];

  if (!name || !/^[A-Za-z\s]{2,50}$/.test(name.trim())) {
    errors.push("Name must be 2–50 characters, letters and spaces only.");
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.push("Email format is invalid.");
  }
  if (
    !password ||
    !/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password)
  ) {
    errors.push(
      "Password must be at least 8 characters and include a letter, a number, and a symbol.",
    );
  }
  if (!role || !VALID_ROLES.includes(role)) {
    errors.push("Role must be one of: student, professor, staff.");
  }

  return errors;
}

async function createUser(req, res) {
  const { name, email, password, role } = req.body;

  const errors = validateCreateUserInput({ name, email, password, role });
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  try {
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [
      email.trim().toLowerCase(),
    ]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ errors: ["Email is already registered."] });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role`,
      [name.trim(), email.trim().toLowerCase(), passwordHash, role],
    );

    return res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    console.error("Admin create user error:", err.message);
    return res.status(500).json({ error: "Something went wrong." });
  }
}

async function getAllBookings(req, res) {
  try {
    const result = await pool.query(
      `SELECT b.id, b.access_code, b.booking_date, b.device_count, b.status,
              s.start_time, s.end_time,
              l.name AS location_name,
              u.name AS user_name, u.email AS user_email
       FROM bookings b
       JOIN wifi_slots s ON b.slot_id = s.id
       JOIN locations l ON s.location_id = l.id
       JOIN users u ON b.user_id = u.id
       ORDER BY b.booking_date DESC, s.start_time DESC`,
    );
    return res.status(200).json({ bookings: result.rows });
  } catch (err) {
    console.error("Admin get all bookings error:", err.message);
    return res.status(500).json({ error: "Something went wrong." });
  }
}

module.exports = { createUser, getAllBookings };
