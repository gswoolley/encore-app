// managerRoutes.js: Manager-only routes for editing users, manager status, and media

const express = require("express");
const router = express.Router();

const { ensureManager } = require("../middleware/managerMiddleware");
const { showEditUser, updateUser, toggleManager, deleteMedia } = require("../controllers/managerController");

// Manager-only routes for editing users and media
router.use(ensureManager);

router.get("/manager/user/:userid/edit", showEditUser);
router.post("/manager/user/:userid/edit", updateUser);
router.post("/manager/user/:userid/toggle-manager", toggleManager);
router.post("/manager/user/:userid/media/:mediaId/delete", deleteMedia);

module.exports = router;
