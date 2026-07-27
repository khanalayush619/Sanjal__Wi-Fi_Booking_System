const bcrypt = require("bcrypt");
const { pool } = require("../db/pool");

const SALT_ROUNDS = 10;
const jwt = require("jsonwebtoken");

function validateRegisterInput({ name, email, password }) {
  const errors = [];

  if (!name || typeof name !== "string") {
    errors.push("Name is required.");
  } else if (!/^[A-Za-z\s]{2,50}$/.test(name.trim())) {
    errors.push(
      "Name must be 2-50 characters and contain only letters and spaces.",
    );
  }

  if (!email || typeof email !== "string") {
    errors.push("Email is required.");
  } else if (!/[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.push("Email format is invalid.");
  }

  if (!password || typeof password !== "string") {
    errors.push("Password is required.");
  } else if (!/^(?=.*[A-Za-z])(?=.*\d)(?=.*[A-Za-z0-9]).{8,}$/.test(password)) {
    errors.push(
      "Password must be at least 8 characters and include a letter, a number, and a symbol.",
    );
  }

  return errors;
}

async function register(req, res) {
  const { name, email, password } = req.body;

  const errors = validateRegisterInput({ name, email, password });
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
         VALUES ($1, $2, $3, 'student')
         RETURNING id, name, email, role`,
      [name.trim(), email.trim().toLowerCase(), passwordHash],
    );

    return res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    console.error("Register error:", err.message);
    return res
      .status(500)
      .json({ error: "Something went wrong during registration." });
  }
}

function validateLoginInput({ email, password }) {
  const errors = [];
  if (!email || typeof email != "string") {
    errors.push("Email is required.");
  }
  if (!password || typeof password != "string") {
    errors.push("Password is required.");
  }

  return errors;
}

async function login(req, res) {
  const { email, password } = req.body;

  const errors = validateLoginInput({ email, password });
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  try {
    const result = await pool.query(
      "SELECT id, name, email, password_hash, role FROM users WHERE EMAIL = $1",
      [email.trim().toLowerCase()],
    );

    const genericError = { errors: ["Invalid email or password."] };
    if (result.rows.length === 0) {
      return res.status(401).json(genericError);
    }

    const user = result.rows[0];
    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json(genericError);
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Login error:", err.message);
    return res
      .status(500)
      .json({ error: "Something went wrong during login." });
  }
}

module.exports = { register, login };
