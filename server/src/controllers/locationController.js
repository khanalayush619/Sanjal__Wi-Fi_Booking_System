const { pool } = require("../db/pool");

async function getLocations(req, res) {
  try {
    const result = await pool.query(
      "SELECT id, name, floor, device_capacity FROM locations ORDER BY name",
    );
    return res.status(200).json({ locations: result.rows });
  } catch (err) {
    console.error("Get locations error:", err.message);
    return res.status(500).json({ error: "Something went wrong." });
  }
}

module.exports = { getLocations };
