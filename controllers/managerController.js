// managerController.js: Manager-only actions for editing users, roles, and media

const db = require("../utils/db");
const path = require("path");
const fs = require("fs");
const { renderError } = require("../utils/errorHandler");
const mediaModel = require("../models/mediaModel");
const { buildProfileImageUrl } = require("../utils/imageUtils");

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
        "u.availability",
        "u.profile_image_path"
      )
      .where("s.userid", userid)
      .first();

    if (!user) {
      return renderError(res, "User not found.", null, 404);
    }

    const media = await mediaModel.getMediaByUserId(userid);

    const userWithImage = user
      ? {
          ...user,
          imageUrl: buildProfileImageUrl({
            profileImagePath: user.profile_image_path,
            seed: user.email,
          }),
        }
      : null;

    res.render("managerEditUser", { user: userWithImage, media, error_message: "" });
  } catch (error) {
    renderError(res, "Unable to load user for editing.", error);
  }
};

// Delete a user entirely: media files + records, profile row, and security row
const deleteUser = async (req, res) => {
  const { userid } = req.params;

  try {
    const securityRow = await db("security").where("userid", userid).first();
    if (!securityRow) {
      return renderError(res, "User not found.", null, 404);
    }

    const profileRow = await db("users").where("userid", userid).first();

    if (profileRow && profileRow.profile_image_path && profileRow.profile_image_path.startsWith("profile-images/")) {
      const profilePath = path.join(__dirname, "../uploads", profileRow.profile_image_path);
      fs.unlink(profilePath, (err) => {
        if (err && err.code !== "ENOENT") {
          console.error("Error deleting profile image:", err.message);
        }
      });
    }

    const media = await mediaModel.getMediaByUserId(userid);
    for (const item of media) {
      if (item.media_path) {
        const mediaPath = path.join(__dirname, "../uploads", item.media_path);
        fs.unlink(mediaPath, (err) => {
          if (err && err.code !== "ENOENT") {
            console.error("Error deleting media file:", err.message);
          }
        });
      }
    }

    await db("user_media").where({ userid }).del();
    await db("users").where({ userid }).del();
    await db("security").where({ userid }).del();

    req.session.flashMessage = "User deleted.";
    res.redirect("/directory");
  } catch (error) {
    renderError(res, "Unable to delete user.", error);
  }
};

// Manager save handler for another user's profile fields
const updateUser = async (req, res) => {
  const { userid } = req.params;
  const { is_performer, act_category, genre, bio, location, availability, default_avatar } = req.body;

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

    if (req.file) {
      profileData.profile_image_path = `profile-images/${req.file.filename}`;
    } else if (default_avatar) {
      profileData.profile_image_path = `default-avatars/${default_avatar}`;
    }

    const existingProfile = await db("users").where("userid", userid).first();
    if (existingProfile) {
      await db("users").where("userid", userid).update(profileData);
    } else {
      await db("users").insert({ userid, ...profileData });
    }

    req.session.flashMessage = "User profile updated.";
    res.redirect(`/performer/${userid}`);
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
  deleteUser,
};
