// availabilityController.js: Lets performers view and update their booking availability

const { renderError } = require("../utils/errorHandler");
const userModel = require("../models/userModel");

// Show availability form for the logged-in performer
const showAvailability = async (req, res) => {
  try {
    const profile = await userModel.getAvailabilityByUserId(req.session.user.id);

    if (!profile) {
      return res.redirect("/profile/add");
    }

    res.render("availability", {
      availability: profile.availability || "N",
    });
  } catch (error) {
    renderError(res, "Unable to load availability right now.", error);
  }
};

// Persist availability change for the logged-in performer
const updateAvailability = async (req, res) => {
  const { availability } = req.body;
  try {
    const updated = await userModel.updateAvailabilityByUserId(
      req.session.user.id,
      availability || "N"
    );

    if (updated === 0) {
      return res.redirect("/profile/add");
    }

    req.session.flashMessage = "Availability saved.";
    res.redirect("/availability");
  } catch (error) {
    renderError(res, "Unable to update availability right now.", error);
  }
};

module.exports = {
  showAvailability,
  updateAvailability,
};
