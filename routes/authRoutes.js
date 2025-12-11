// authRoutes.js: Route definitions for registration, login, and logout endpoints

const express = require("express");
const router = express.Router();

// Auth handlers (register/login/logout)
const { showRegister, register, showLogin, login, logout } = require("../controllers/authController");

const { uploadImage } = require("../middleware/uploadMiddleware");

router.get("/register", showRegister);
router.post("/register", uploadImage, register);
router.get("/login", showLogin);
router.post("/login", login);
router.get("/logout", logout);

module.exports = router;
