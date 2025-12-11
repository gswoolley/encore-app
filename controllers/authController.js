// authController.js: Handles user registration, login, and logout flows

const bcrypt = require("bcryptjs");
const { renderError } = require("../utils/errorHandler");
const securityModel = require("../models/securityModel");
const userModel = require("../models/userModel");

// Render registration form
const showRegister = (req, res) => {
  if (req.session.user) {
    return res.redirect("/purpose");
  }
  res.render("register", { error_message: "" });
};

// Handle account creation + initial profile row
const register = async (req, res) => {
  const { name, email, password, confirmPassword, is_performer, default_avatar } = req.body;

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
    const existing = await securityModel.findByEmail(email);
    if (existing) {
      return res.render("register", {
        error_message: "That email already has an account.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userRow = await securityModel.createUser({
      name,
      email,
      password: hashedPassword,
    });
    req.session.user = {
      id: userRow.userid,
      name: userRow.name,
      email: userRow.email,
      is_manager: false,
    };

    // Create an initial (possibly minimal) profile row tied to this account
    const profileData = {
      userid: userRow.userid,
      genre: null,
      bio: null,
      availability: "N",
      location: null,
      is_performer: is_performer === "Y",
    };

    if (req.file) {
      profileData.profile_image_path = `profile-images/${req.file.filename}`;
    } else if (default_avatar) {
      profileData.profile_image_path = `default-avatars/${default_avatar}`;
    }

    await userModel.createProfile(profileData);
    res.redirect("/purpose");
  } catch (error) {
    renderError(res, "Unable to register right now.", error);
  }
};

// Render login form
const showLogin = (req, res) => {
  if (req.session.user) {
    return res.redirect("/dashboard");
  }
  res.render("login", { error_message: "" });
};

// Handle login and bootstrap session
const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await securityModel.findByEmail(email);

    if (!user) {
      return res.render("login", {
        error_message: "No account found with that email.",
      });
    }

    const isValidPassword = password === user.password;

    if (!isValidPassword) {
      return res.render("login", {
        error_message: "Incorrect password. Please try again.",
      });
    }

    req.session.user = {
      id: user.userid,
      name: user.name,
      email: user.email,
      is_manager: !!user.is_manager,
    };
    res.redirect("/purpose");
  } catch (error) {
    renderError(res, "Unable to log in right now.", error);
  }
};

// Destroy session and send user back to home
const logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
};

module.exports = {
  showRegister,
  register,
  showLogin,
  login,
  logout,
};
