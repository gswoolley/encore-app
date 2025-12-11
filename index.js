// Load environment variables (DB, session secret, etc.)
require("dotenv").config();

const express = require("express");
const session = require("express-session");
const path = require("path");

const { authMiddleware } = require("./middleware/authMiddleware");
const { renderError } = require("./utils/errorHandler");

const mainRoutes = require("./routes/mainRoutes");
const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const managerRoutes = require("./routes/managerRoutes");

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

// Configure EJS view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Body parsing and static asset hosting
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Session middleware for login state
app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback-secret-key",
    resave: false,
    saveUninitialized: false,
  })
);

// Make current user + flash message available to all views
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.flashMessage = req.session.flashMessage || null;
  delete req.session.flashMessage;
  next();
});

// Simple auth gate: allow public routes, otherwise require session
app.use(authMiddleware);

// Mount route modules
app.use(mainRoutes);
app.use(authRoutes);
app.use(profileRoutes);
app.use(managerRoutes);

// 404 handler for unknown routes
app.use((req, res) => {
  renderError(res, "Page not found.", null, 404);
});

// Error handler for unexpected exceptions
app.use((err, req, res, next) => {
  renderError(res, "Something went wrong.", err);
});

// Start the HTTP server
app.listen(port, () => {
  console.log(`Encore app listening on port ${port}`);
});
