// Paths that do not require authentication
const publicPaths = ["/", "/login", "/register"];

const authMiddleware = (req, res, next) => {
  // Let public URLs through without checking session
  if (publicPaths.includes(req.path)) {
    return next();
  }
  // Require a logged-in user for all other routes
  if (req.session && req.session.user) {
    return next();
  }
  return res.redirect("/login");
};

module.exports = {
  authMiddleware,
  publicPaths,
};
