const { buildProfileImageUrl } = require("../utils/imageUtils");
const { renderError } = require("../utils/errorHandler");
const userModel = require("../models/userModel");

// List performers in the public directory with optional search
const directory = async (req, res) => {
  const { search = "" } = req.query;
  const term = search.trim().toLowerCase();

  try {
    const columns = [
      "s.userid",
      "s.name",
      "s.email",
      "s.is_manager",
      "u.act_category",
      "u.genre",
      "u.bio",
      "u.availability",
      "u.location",
      "u.profile_image_path",
    ];
    const performers = await userModel.getDirectoryPerformers(columns, term);

    const performersWithImages = performers.map((p) => ({
      ...p,
      imageUrl: buildProfileImageUrl({
        profileImagePath: p.profile_image_path,
        seed: p.email,
      }),
    }));

    res.render("directory", { performers: performersWithImages, search });
  } catch (error) {
    renderError(res, "Unable to load the directory.", error);
  }
};

// Public performer detail page with media gallery
const showPerformer = async (req, res) => {
  const { userid } = req.params;

  if (!userid) {
    return renderError(res, "Performer not found.");
  }

  try {
    const columns = [
      "s.userid",
      "s.name",
      "s.email",
      "s.is_manager",
      "u.performerid",
      "u.act_category",
      "u.genre",
      "u.bio",
      "u.availability",
      "u.location",
      "u.profile_image_path",
    ];

    const performer = await userModel.getProfileWithSecurityByUserId(userid, columns);

    if (!performer || !performer.performerid) {
      return renderError(res, "Performer not found.", null, 404);
    }

    let profileImagePath = performer.profile_image_path;
    const imageUrl = buildProfileImageUrl({
      profileImagePath,
      seed: performer.email,
    });

    // Load media for this performer
    const mediaModel = require("../models/mediaModel");
    const media = await mediaModel.getMediaByUserId(userid);

    res.render("performer", {
      performer: { ...performer, imageUrl },
      media,
    });
  } catch (error) {
    renderError(res, "Unable to load performer details.", error);
  }
};

module.exports = {
  directory,
  showPerformer,
};
