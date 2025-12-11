const express = require("express");
const router = express.Router();

// Dashboard, profile, and media handlers for the logged-in user
const {
  dashboard,
  showProfile,
  showAddProfile,
  addProfile,
  showEditProfile,
  editProfile,
  deleteProfile,
  showMedia,
  addMediaItem,
} = require("../controllers/profileController");

const { uploadImage, uploadMedia } = require("../middleware/uploadMiddleware");

router.get("/dashboard", dashboard);
router.get("/profile", showProfile);
router.get("/profile/media", showMedia);
router.post("/profile/media", uploadMedia, addMediaItem);
router.get("/profile/add", showAddProfile);
router.post("/profile/add", uploadImage, addProfile);
router.get("/profile/edit", showEditProfile);
router.post("/profile/edit", uploadImage, editProfile);
router.post("/profile/delete", deleteProfile);

module.exports = router;
