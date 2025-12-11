const db = require("../db");
const path = require("path");
const fs = require("fs");
const { renderError } = require("../utils/errorHandler");
const mediaModel = require("../models/mediaModel");

// Manager view to edit another user's profile + media
const showEditUser = async (req, res) => {
  const { userid } = req.params;

  try {
    const user = await db("security as s")
      .leftJoin("users as u", "u.userid", "s.userid")
      .select(
        "s.userid",
        "s.name",
        "s.email",
        "s.is_manager",
        "u.is_performer",
        "u.act_category",
        "u.genre",
        "u.bio",
        "u.location",
        "u.availability"
      )
      .where("s.userid", userid)
      .first();

    if (!user) {
      return renderError(res, "User not found.", null, 404);
    }

    const media = await mediaModel.getMediaByUserId(userid);

    res.render("managerEditUser", { user, media, error_message: "" });
  } catch (error) {
    renderError(res, "Unable to load user for editing.", error);
  }
};

// Manager save handler for another user's profile fields
const updateUser = async (req, res) => {
  const { userid } = req.params;
  const { is_performer, act_category, genre, bio, location, availability } = req.body;

  try {
    const exists = await db("security").where("userid", userid).first();
    if (!exists) {
      return renderError(res, "User not found.", null, 404);
    }

    const profileData = {
      act_category: act_category || null,
      genre: genre || null,
      bio: bio || null,
      location: location || null,
      availability: availability || "N",
      is_performer: is_performer === "Y",
    };

    const existingProfile = await db("users").where("userid", userid).first();
    if (existingProfile) {
      await db("users").where("userid", userid).update(profileData);
    } else {
      await db("users").insert({ userid, ...profileData });
    }

    res.redirect(`/manager/user/${userid}/edit`);
  } catch (error) {
    renderError(res, "Unable to update user profile.", error);
  }
};

// Elevate or demote a user to/from manager
const toggleManager = async (req, res) => {
  const { userid } = req.params;
  const { make_manager } = req.body;

  try {
    await db("security")
      .where("userid", userid)
      .update({ is_manager: make_manager === "true" });

    // If the manager edited themselves, update session flag
    if (req.session.user && req.session.user.id === Number(userid)) {
      req.session.user.is_manager = make_manager === "true";
    }

    res.redirect("/manager/users");
  } catch (error) {
    renderError(res, "Unable to update manager status.", error);
  }
};

// Delete a specific media item for a given user
const deleteMedia = async (req, res) => {
  const { userid, mediaId } = req.params;

  try {
    const media = await mediaModel.getMediaById(mediaId);
    if (!media || String(media.userid) !== String(userid)) {
      return renderError(res, "Media item not found.", null, 404);
    }

    // Attempt to delete the file from disk
    if (media.media_path) {
      const filePath = path.join(__dirname, "../uploads", media.media_path);
      fs.unlink(filePath, (err) => {
        if (err && err.code !== "ENOENT") {
          console.error("Error deleting media file:", err.message);
        }
      });
    }

    await mediaModel.deleteMediaById(mediaId);
    res.redirect(`/manager/user/${userid}/edit`);
  } catch (error) {
    renderError(res, "Unable to delete media item.", error);
  }
};

module.exports = {
  showEditUser,
  updateUser,
  toggleManager,
  deleteMedia,
};
