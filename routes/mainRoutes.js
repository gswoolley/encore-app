// mainRoutes.js: Core site routes for home, FAQ, directory, and availability

const express = require("express");
const router = express.Router();

// Home / high-level pages
const { root, showFaq, showPurpose, handlePurpose, success } = require("../controllers/homeController");
// Directory + public performer views
const { directory, showPerformer } = require("../controllers/directoryController");
// Availability for performers
const { showAvailability, updateAvailability } = require("../controllers/availabilityController");

router.get("/", root);
router.get("/faq", showFaq);
router.get("/purpose", showPurpose);
router.post("/purpose", handlePurpose);
router.get("/success", success);
router.get("/directory", directory);
router.get("/performer/:userid", showPerformer);
router.get("/availability", showAvailability);
router.post("/availability", updateAvailability);

module.exports = router;
