const express = require("express");
const cors = require("cors");
const { testConnection } = require("./db/pool");

const app = express();
const authRoutes = require("./routes/authRoutes");
const locationRoutes = require("./routes/locationRoutes");
const slotRoutes = require("./routes/slotRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const checkinRoutes = require("./routes/checkinRoutes");
const adminRoutes = require("./routes/adminRoutes");

const authMiddleware = require("./middleware/authMiddleware");
app.get("/api/protected-test", authMiddleware, (req, res) => {
  res.json({ message: "You are authenticated!", user: req.user });
});

// Middleware
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/slots", slotRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/checkins", checkinRoutes);
app.use("/api/admin", adminRoutes);

// Routes
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// 404 handler (after all routes)
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Generic error handler (always last)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong" });
});

// Startup
const PORT = process.env.PORT || 5000;

async function start() {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();

module.exports = app;
