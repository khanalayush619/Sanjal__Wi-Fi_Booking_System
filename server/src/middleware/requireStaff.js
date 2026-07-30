function requireStaff(req, res, next) {
  if (req.user.role !== "staff") {
    return res
      .status(403)
      .json({ error: "This action requires staff privileges." });
  }
  next();
}

module.exports = requireStaff;
