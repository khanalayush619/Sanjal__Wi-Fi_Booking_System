const { pool } = require("../db/pool");

const { disableHotspotUser, disconnectUser } = require("../network/hotspot");

async function expireBookings() {
  try {
    const result = await pool.query(`
      SELECT id, hotspot_username
      FROM bookings
      WHERE status='confirmed'
      AND code_valid_until <= NOW()
      AND hotspot_username IS NOT NULL
    `);

    for (const booking of result.rows) {
      try {
        await disableHotspotUser(booking.hotspot_username);

        await disconnectUser(booking.hotspot_username);

        await pool.query(
          `
          UPDATE bookings
          SET status='expired'
          WHERE id=$1
        `,
          [booking.id],
        );

        console.log(`Booking ${booking.id} expired`);
      } catch (err) {
        console.error(`Failed to expire booking ${booking.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error("Expiry job error:", err.message);
  }
}

module.exports = expireBookings;
