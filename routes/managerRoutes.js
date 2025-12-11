// managerRoutes.js: Manager-only routes for editing users, manager status, and media

const express = require("express");
const router = express.Router();

const { ensureManager } = require("../middleware/managerMiddleware");
const { uploadImage } = require("../middleware/uploadMiddleware");
const { showEditUser, updateUser, toggleManager, deleteMedia, deleteUser } = require("../controllers/managerController");

// Manager-only routes for editing users and media
router.use(ensureManager);

router.get("/manager/user/:userid/edit", showEditUser);
router.post("/manager/user/:userid/edit", uploadImage, updateUser);
router.post("/manager/user/:userid/toggle-manager", toggleManager);
router.post("/manager/user/:userid/media/:mediaId/delete", deleteMedia);
router.post("/manager/user/:userid/delete", deleteUser);

module.exports = router;
