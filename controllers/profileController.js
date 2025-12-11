// profileController.js: Manages logged-in user's dashboard, profile, and media gallery

const { buildProfileImageUrl, getDefaultAvatarPath } = require("../utils/imageUtils");
const { renderError } = require("../utils/errorHandler");
const userModel = require("../models/userModel");
const mediaModel = require("../models/mediaModel");

// Show a simple dashboard summary of the current user's profile
const dashboard = async (req, res) => {
  try {
    const columns = [
      "genre",
      "bio",
      "availability",
      "location",
      "act_category",
      "profile_image_path",
      "is_performer",
    ];

    const profile = await userModel.getProfileSummaryByUserId(
      req.session.user.id,
      columns
    );

    const profileWithImage = profile
      ? {
          ...profile,
          imageUrl: buildProfileImageUrl({
            profileImagePath: profile.profile_image_path,
            seed: req.session.user.email,
          }),
        }
      : null;

    res.render("dashboard", {
      user: req.session.user,
      profile: profileWithImage,
    });
  } catch (error) {
    renderError(res, "Unable to load the dashboard right now.", error);
  }
};

// Show the logged-in user's profile (performer-only fields hidden when not a performer)
const showProfile = async (req, res) => {
  try {
    const columns = [
      "s.userid",
      "s.name",
      "s.email",
      "u.performerid",
      "u.is_performer",
      "u.act_category",
      "u.genre",
      "u.bio",
      "u.availability",
      "u.location",
      "u.profile_image_path",
    ];

    const profile = await userModel.getProfileWithSecurityByUserId(
      req.session.user.id,
      columns
    );

    if (!profile || !profile.performerid) {
      return res.redirect("/profile/add");
    }

    // If no profile image path is set yet, assign and persist a default avatar
    let profileImagePath = profile.profile_image_path;
    if (!profileImagePath) {
      profileImagePath = getDefaultAvatarPath(profile.email);
      await userModel.updateProfile(profile.userid, {
        profile_image_path: profileImagePath,
      });
      profile.profile_image_path = profileImagePath;
    }

    const imageUrl = buildProfileImageUrl({
      profileImagePath,
      seed: profile.email,
    });

    const media = await mediaModel.getMediaByUserId(req.session.user.id);

    res.render("profile", { profile: { ...profile, imageUrl }, media });
  } catch (error) {
    renderError(res, "Unable to load your profile.", error);
  }
};

// Show media gallery for the logged-in user
const showMedia = async (req, res) => {
  try {
    const media = await mediaModel.getMediaByUserId(req.session.user.id);
    res.render("profileMedia", { media, error_message: "" });
  } catch (error) {
    renderError(res, "Unable to load your media gallery.", error);
  }
};

// Handle media upload (image or video) for the logged-in user
const addMediaItem = async (req, res) => {
  // If the upload middleware reported an error, show it
  if (req.uploadError) {
    const media = await mediaModel.getMediaByUserId(req.session.user.id);
    return res.render("profileMedia", {
      media,
      error_message: req.uploadError,
    });
  }

  // No file uploaded
  if (!req.file) {
    const media = await mediaModel.getMediaByUserId(req.session.user.id);
    return res.render("profileMedia", {
      media,
      error_message: "Please choose a media file to upload.",
    });
  }

  try {
    const mime = req.file.mimetype || "";
    const media_type = mime.startsWith("image/") ? "image" : "video";

    await mediaModel.addMedia({
      userid: req.session.user.id,
      media_type,
      media_path: `media/${req.file.filename}`,
    });
    res.redirect("/profile/media");
  } catch (error) {
    renderError(res, "Unable to save your media item.", error);
  }
};

// Show form to create a new performer profile (if one does not exist)
const showAddProfile = async (req, res) => {
  try {
    const existing = await userModel.getExistingPerformerByUserId(
      req.session.user.id
    );

    if (existing) {
      return res.redirect("/profile/edit");
    }

    res.render("addProfile", { error_message: "" });
  } catch (error) {
    renderError(res, "Unable to start a new profile.", error);
  }
};

// Create a new profile row for the logged-in user
const addProfile = async (req, res) => {
  const {
    genre,
    bio,
    availability,
    location,
    act_category,
    is_performer,
    default_avatar,
  } = req.body;

  // Only enforce genre/location when the user wants to appear as a performer
  if (is_performer === "Y" && (!genre || !location)) {
    return res.render("addProfile", {
      error_message: "Genre and location are required if you want to appear as a performer.",
    });
  }

  try {
    if (req.uploadError) {
      return res.render("addProfile", {
        error_message: req.uploadError,
      });
    }

    const newProfile = {
      userid: req.session.user.id,
      act_category,
      genre,
      bio,
      availability: availability || "N",
      location,
      is_performer: is_performer === "Y",
    };

    if (req.file) {
      newProfile.profile_image_path = `profile-images/${req.file.filename}`;
    } else if (default_avatar) {
      newProfile.profile_image_path = `default-avatars/${default_avatar}`;
    }

    await userModel.createProfile(newProfile);
    req.session.flashMessage = "Profile created successfully.";
    res.redirect("/profile");
  } catch (error) {
    console.error("Unable to create profile:", error);
    renderError(res, "Unable to create your profile.", error);
  }
};

// Show edit form for the logged-in user's profile
const showEditProfile = async (req, res) => {
  try {
    const columns = ["genre", "bio", "availability", "location", "profile_image_path", "is_performer"];

    const profile = await userModel.getUserRowById(
      req.session.user.id,
      columns
    );

    if (!profile) {
      return res.redirect("/profile/add");
    }
    res.render("editProfile", {
      profile: {
        ...profile,
        imageUrl: buildProfileImageUrl({
          profileImagePath: profile.profile_image_path,
          seed: req.session.user.email,
        }),
      },
      error_message: "",
    });
  } catch (error) {
    renderError(res, "Unable to load the edit page.", error);
  }
};

// Persist changes to the logged-in user's profile
const editProfile = async (req, res) => {
  const {
    genre,
    bio,
    availability,
    location,
    act_category,
    is_performer,
    default_avatar,
  } = req.body;

  if (is_performer === "Y" && (!genre || !location)) {
    return res.render("editProfile", {
      profile: { genre, bio, availability, location, is_performer: is_performer === "Y" },
      error_message: "Genre and location are required if you want to appear as a performer.",
    });
  }

  try {
    if (req.uploadError) {
      return res.render("editProfile", {
        profile: { genre, bio, availability, location },
        error_message: req.uploadError,
      });
    }

    const updateData = {
      act_category,
      genre,
      bio,
      availability: availability || "N",
      location,
      is_performer: is_performer === "Y",
    };

    if (req.file) {
      updateData.profile_image_path = `profile-images/${req.file.filename}`;
    } else if (default_avatar) {
      updateData.profile_image_path = `default-avatars/${default_avatar}`;
    }

    await userModel.updateProfile(req.session.user.id, updateData);
    req.session.flashMessage = "Profile updated.";
    res.redirect("/profile");
  } catch (error) {
    console.error("Unable to update profile:", error);
    renderError(res, "Unable to update your profile.", error);
  }
};

// Delete the current user's profile row
const deleteProfile = async (req, res) => {
  try {
    await userModel.deleteProfileByUserId(req.session.user.id);
    req.session.flashMessage = "Profile deleted.";
    res.redirect("/profile/add");
  } catch (error) {
    renderError(res, "Unable to delete your profile.", error);
  }
};

module.exports = {
  dashboard,
  showProfile,
  showAddProfile,
  addProfile,
  showEditProfile,
  editProfile,
  deleteProfile,
  showMedia,
  addMediaItem,
};
