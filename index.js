// Load environment variables (DB, session secret, etc.)
require("dotenv").config();

const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const path = require("path");
const db = require("./db"); // Knex instance configured for Postgres

const app = express();
const port = process.env.PORT || 3000;

// Configure EJS views
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Body parsing and static assets
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Session middleware for auth state
app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback-secret-key",
    resave: false,
    saveUninitialized: false,
  })
);

// Expose user + flash messages to all templates
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.flashMessage = req.session.flashMessage || null;
  delete req.session.flashMessage;
  next();
});

// Simple auth gate: allow public routes, otherwise require session
const publicPaths = ["/", "/login", "/register"];
app.use((req, res, next) => {
  if (publicPaths.includes(req.path)) {
    return next();
  }
  if (req.session.user) {
    return next();
  }
  res.redirect("/login");
});

// Helper to render errors and log server issues
const renderError = (res, message, error = null, status = 500) => {
  if (error) {
    console.error(message, error);
  } else {
    console.error(message);
  }
  res.status(status).render("error", { message, error });
};

// Public landing page (marketing/cta)
app.get("/", (req, res) => {
  res.render("index");
});

// Registration form
app.get("/register", (req, res) => {
  if (req.session.user) {
    return res.redirect("/dashboard");
  }
  res.render("register", { error_message: "" });
});

// Handle registration: validate, check duplicate email, hash password, create user, log in
app.post("/register", async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;

  if (!name || !email || !password || !confirmPassword) {
    return res.render("register", {
      error_message: "All fields are required.",
    });
  }

  if (password !== confirmPassword) {
    return res.render("register", {
      error_message: "Passwords do not match.",
    });
  }

  try {
    const existing = await db("security")
      .whereRaw("LOWER(email) = ?", [email.toLowerCase()])
      .first();
    if (existing) {
      return res.render("register", {
        error_message: "That email already has an account.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db("security")
      .insert({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
      })
      .returning(["userid", "name", "email"]);

    const userRow = result[0];
    req.session.user = {
      id: userRow.userid,
      name: userRow.name,
      email: userRow.email,
    };
    res.redirect("/dashboard");
  } catch (error) {
    renderError(res, "Unable to register right now.", error);
  }
});

// Login form
app.get("/login", (req, res) => {
  if (req.session.user) {
    return res.redirect("/dashboard");
  }
  res.render("login", { error_message: "" });
});

// Handle login: fetch user, compare password hash, store session
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await db("security")
      .whereRaw("LOWER(email) = ?", [email.toLowerCase()])
      .first();

    if (!user) {
      return res.render("login", {
        error_message: "No account found with that email.",
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.render("login", {
        error_message: "Incorrect password. Please try again.",
      });
    }

    req.session.user = {
      id: user.userid,
      name: user.name,
      email: user.email,
    };
    res.redirect("/dashboard");
  } catch (error) {
    renderError(res, "Unable to log in right now.", error);
  }
});

// Logout destroys session and redirects home
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// Authenticated dashboard summary
app.get("/dashboard", async (req, res) => {
  try {
    const profile = await db("users")
      .select("genre", "bio", "availability", "location")
      .where("userid", req.session.user.id)
      .first();

    res.render("dashboard", {
      user: req.session.user,
      profile: profile || null,
    });
  } catch (error) {
    renderError(res, "Unable to load the dashboard right now.", error);
  }
});

// View profile; redirect to add if none exists
app.get("/profile", async (req, res) => {
  try {
    const profile = await db("security as s")
      .leftJoin("users as u", "u.userid", "s.userid")
      .select(
        "s.userid",
        "s.name",
        "s.email",
        "u.performerid",
        "u.genre",
        "u.bio",
        "u.availability",
        "u.location"
      )
      .where("s.userid", req.session.user.id)
      .first();

    if (!profile || !profile.performerid) {
      return res.redirect("/profile/add");
    }

    res.render("profile", { profile });
  } catch (error) {
    renderError(res, "Unable to load your profile.", error);
  }
});

// Start new profile form (guard if one already exists)
app.get("/profile/add", async (req, res) => {
  try {
    const existing = await db("users")
      .select("performerid")
      .where("userid", req.session.user.id)
      .first();

    if (existing) {
      return res.redirect("/profile/edit");
    }

    res.render("addProfile", { error_message: "" });
  } catch (error) {
    renderError(res, "Unable to start a new profile.", error);
  }
});

// Create profile record
app.post("/profile/add", async (req, res) => {
  const { genre, bio, availability, location } = req.body;

  if (!genre || !location) {
    return res.render("addProfile", {
      error_message: "Genre and location are required.",
    });
  }

  try {
    await db("users").insert({
      userid: req.session.user.id,
      genre,
      bio,
      availability: availability || "N",
      location,
    });
    req.session.flashMessage = "Profile created successfully.";
    res.redirect("/profile");
  } catch (error) {
    renderError(res, "Unable to create your profile.", error);
  }
});

// Edit profile form
app.get("/profile/edit", async (req, res) => {
  try {
    const profile = await db("users")
      .select("genre", "bio", "availability", "location")
      .where("userid", req.session.user.id)
      .first();

    if (!profile) {
      return res.redirect("/profile/add");
    }
    res.render("editProfile", {
      profile,
      error_message: "",
    });
  } catch (error) {
    renderError(res, "Unable to load the edit page.", error);
  }
});

// Apply profile updates
app.post("/profile/edit", async (req, res) => {
  const { genre, bio, availability, location } = req.body;

  if (!genre || !location) {
    return res.render("editProfile", {
      profile: { genre, bio, availability, location },
      error_message: "Genre and location are required.",
    });
  }

  try {
    await db("users")
      .where("userid", req.session.user.id)
      .update({
        genre,
        bio,
        availability: availability || "N",
        location,
      });
    req.session.flashMessage = "Profile updated.";
    res.redirect("/profile");
  } catch (error) {
    renderError(res, "Unable to update your profile.", error);
  }
});

// Delete profile record
app.post("/profile/delete", async (req, res) => {
  try {
    await db("users").where("userid", req.session.user.id).del();
    req.session.flashMessage = "Profile deleted.";
    res.redirect("/profile/add");
  } catch (error) {
    renderError(res, "Unable to delete your profile.", error);
  }
});

// Directory listing with optional search filter (name/genre/location)
app.get("/directory", async (req, res) => {
  const { search = "" } = req.query;
  const term = search.trim().toLowerCase();

  try {
    const performers = await db("users as u")
      .join("security as s", "s.userid", "u.userid")
      .select("s.name", "s.email", "u.genre", "u.bio", "u.availability", "u.location")
      .modify((query) => {
        if (term) {
          query.whereRaw(
            "(LOWER(s.name) LIKE ? OR LOWER(u.genre) LIKE ? OR LOWER(u.location) LIKE ?)",
            [`%${term}%`, `%${term}%`, `%${term}%`]
          );
        }
      })
      .orderByRaw("LOWER(s.name) ASC");

    res.render("directory", { performers, search });
  } catch (error) {
    renderError(res, "Unable to load the directory.", error);
  }
});

// Availability form (redirect to create profile if missing)
app.get("/availability", async (req, res) => {
  try {
    const profile = await db("users")
      .select("availability")
      .where("userid", req.session.user.id)
      .first();

    if (!profile) {
      return res.redirect("/profile/add");
    }

    res.render("availability", {
      availability: profile.availability || "N",
    });
  } catch (error) {
    renderError(res, "Unable to load availability right now.", error);
  }
});

// Save availability toggle
app.post("/availability", async (req, res) => {
  const { availability } = req.body;
  try {
    const updated = await db("users")
      .where("userid", req.session.user.id)
      .update({ availability: availability || "N" });

    if (updated === 0) {
      return res.redirect("/profile/add");
    }

    req.session.flashMessage = "Availability saved.";
    res.redirect("/availability");
  } catch (error) {
    renderError(res, "Unable to update availability right now.", error);
  }
});

// Generic success page (optional)
app.get("/success", (req, res) => {
  const message = req.query.message || "Action completed successfully.";
  res.render("success", { message });
});

// 404 handler
app.use((req, res) => {
  renderError(res, "Page not found.", null, 404);
});

// Error handler for unexpected exceptions
app.use((err, req, res, next) => {
  renderError(res, "Something went wrong.", err);
});

// Start the server
app.listen(port, () => {
  console.log(`Encore app listening on port ${port}`);
});
