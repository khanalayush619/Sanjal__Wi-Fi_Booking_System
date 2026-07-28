const crypto = require("crypto");

function generateAccessCode() {
  return crypto.randomBytes(6).toString("hex"); // 12-character hex string
}

module.exports = { generateAccessCode };
