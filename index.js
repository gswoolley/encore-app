require("dotenv").config();
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const path = require("path");
const pool = require("./db");

const app = express();
const port = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback-secret-key",
    resave: false,
    saveUninitialized: false,
  })
);

// Surface the logged-in user and flash messages to templates
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.flashMessage = req.session.flashMessage || null;
  delete req.session.flashMessage;
  next();
});

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

const renderError = (res, message, error = null, status = 500) => {
  if (error) {
    console.error(message, error);
  } else {
    console.error(message);
  }
  res.status(status).render("error", { message, error });
};

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/register", (req, res) => {
  if (req.session.user) {
    return res.redirect("/dashboard");
  }
  res.render("register", { error_message: "" });
});

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
    const existing = await pool.query(
      "SELECT userid FROM security WHERE email = $1",
      [email.toLowerCase()]
    );
    if (existing.rowCount > 0) {
      return res.render("register", {
        error_message: "That email already has an account.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO security (name, email, password) VALUES ($1, $2, $3) RETURNING userid, name, email",
      [name, email.toLowerCase(), hashedPassword]
    );

    req.session.user = {
      id: result.rows[0].userid,
      name: result.rows[0].name,
      email: result.rows[0].email,
    };
    res.redirect("/dashboard");
  } catch (error) {
    renderError(res, "Unable to register right now.", error);
  }
});

app.get("/login", (req, res) => {
  if (req.session.user) {
    return res.redirect("/dashboard");
  }
  res.render("login", { error_message: "" });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query(
      "SELECT userid, name, email, password FROM security WHERE email = $1",
      [email.toLowerCase()]
    );
    if (result.rowCount === 0) {
      return res.render("login", {
        error_message: "No account found with that email.",
      });
    }

    const user = result.rows[0];
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

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

app.get("/dashboard", async (req, res) => {
  try {
    const profileResult = await pool.query(
      "SELECT genre, bio, availability, location FROM users WHERE userid = $1",
      [req.session.user.id]
    );
    res.render("dashboard", {
      user: req.session.user,
      profile: profileResult.rows[0] || null,
    });
  } catch (error) {
    renderError(res, "Unable to load the dashboard right now.", error);
  }
});

app.get("/profile", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.userid, s.name, s.email, u.performerid, u.genre, u.bio, u.availability, u.location
       FROM security s
       LEFT JOIN users u ON u.userid = s.userid
       WHERE s.userid = $1`,
      [req.session.user.id]
    );

    const profile = result.rows[0];
    if (!profile.performerid) {
      return res.redirect("/profile/add");
    }

    res.render("profile", { profile });
  } catch (error) {
    renderError(res, "Unable to load your profile.", error);
  }
});

app.get("/profile/add", async (req, res) => {
  try {
    const existing = await pool.query(
      "SELECT performerid FROM users WHERE userid = $1",
      [req.session.user.id]
    );

    if (existing.rowCount > 0) {
      return res.redirect("/profile/edit");
    }

    res.render("addProfile", { error_message: "" });
  } catch (error) {
    renderError(res, "Unable to start a new profile.", error);
  }
});

app.post("/profile/add", async (req, res) => {
  const { genre, bio, availability, location } = req.body;

  if (!genre || !location) {
    return res.render("addProfile", {
      error_message: "Genre and location are required.",
    });
  }

  try {
    await pool.query(
      "INSERT INTO users (userid, genre, bio, availability, location) VALUES ($1, $2, $3, $4, $5)",
      [req.session.user.id, genre, bio, availability || "N", location]
    );
    req.session.flashMessage = "Profile created successfully.";
    res.redirect("/profile");
  } catch (error) {
    renderError(res, "Unable to create your profile.", error);
  }
});

app.get("/profile/edit", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT genre, bio, availability, location FROM users WHERE userid = $1",
      [req.session.user.id]
    );
    if (result.rowCount === 0) {
      return res.redirect("/profile/add");
    }
    res.render("editProfile", {
      profile: result.rows[0],
      error_message: "",
    });
  } catch (error) {
    renderError(res, "Unable to load the edit page.", error);
  }
});

app.post("/profile/edit", async (req, res) => {
  const { genre, bio, availability, location } = req.body;

  if (!genre || !location) {
    return res.render("editProfile", {
      profile: { genre, bio, availability, location },
      error_message: "Genre and location are required.",
    });
  }

  try {
    await pool.query(
      "UPDATE users SET genre = $1, bio = $2, availability = $3, location = $4 WHERE userid = $5",
      [genre, bio, availability || "N", location, req.session.user.id]
    );
    req.session.flashMessage = "Profile updated.";
    res.redirect("/profile");
  } catch (error) {
    renderError(res, "Unable to update your profile.", error);
  }
});

app.post("/profile/delete", async (req, res) => {
  try {
    await pool.query("DELETE FROM users WHERE userid = $1", [
      req.session.user.id,
    ]);
    req.session.flashMessage = "Profile deleted.";
    res.redirect("/profile/add");
  } catch (error) {
    renderError(res, "Unable to delete your profile.", error);
  }
});

app.get("/directory", async (req, res) => {
  const { search = "" } = req.query;
  const filters = [];
  const values = [];

  if (search) {
    values.push(`%${search.toLowerCase()}%`);
    filters.push(
      `(LOWER(s.name) LIKE $1 OR LOWER(u.genre) LIKE $1 OR LOWER(u.location) LIKE $1)`
    );
  }

  const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const query = `
    SELECT s.name, s.email, u.genre, u.bio, u.availability, u.location
    FROM users u
    JOIN security s ON s.userid = u.userid
    ${whereClause}
    ORDER BY LOWER(s.name) ASC
  `;

  try {
    const performers = (await pool.query(query, values)).rows;
    res.render("directory", { performers, search });
  } catch (error) {
    renderError(res, "Unable to load the directory.", error);
  }
});

app.get("/availability", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT availability FROM users WHERE userid = $1",
      [req.session.user.id]
    );

    if (result.rowCount === 0) {
      return res.redirect("/profile/add");
    }

    res.render("availability", {
      availability: result.rows[0].availability || "N",
    });
  } catch (error) {
    renderError(res, "Unable to load availability right now.", error);
  }
});

app.post("/availability", async (req, res) => {
  const { availability } = req.body;
  try {
    const update = await pool.query(
      "UPDATE users SET availability = $1 WHERE userid = $2",
      [availability || "N", req.session.user.id]
    );

    if (update.rowCount === 0) {
      return res.redirect("/profile/add");
    }

    req.session.flashMessage = "Availability saved.";
    res.redirect("/availability");
  } catch (error) {
    renderError(res, "Unable to update availability right now.", error);
  }
});

app.get("/success", (req, res) => {
  const message = req.query.message || "Action completed successfully.";
  res.render("success", { message });
});

app.use((req, res) => {
  renderError(res, "Page not found.", null, 404);
});

app.use((err, req, res, next) => {
  renderError(res, "Something went wrong.", err);
});

app.listen(port, () => {
  console.log(`Encore app listening on port ${port}`);
});
