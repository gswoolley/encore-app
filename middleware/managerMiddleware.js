// managerMiddleware.js: Ensures only manager users can access manager-only routes

// Guard middleware to ensure the current user has manager rights
const ensureManager = (req, res, next) => {
  if (!req.session || !req.session.user || !req.session.user.is_manager) {
    return res.status(403).render("error", { message: "You do not have permission to view this page." });
  }
  next();
};

module.exports = {
  ensureManager,
};
