const multer = require("multer");
const path = require("path");

// Disk storage for profile images; capped to 5MB per upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads/profile-images"));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".png";
    const safeExt = ext.toLowerCase();
    const userId = req.session && req.session.user ? req.session.user.id : "anonymous";
    const timestamp = Date.now();
    cb(null, `${userId}-${timestamp}${safeExt}`);
  },
});

// Multer instance for profile image uploads
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Wrap multer to surface user-friendly errors instead of crashing
const uploadImage = (req, res, next) => {
  upload.single("profileImage")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        req.uploadError = "Image too large (max 5MB).";
      } else {
        req.uploadError = "Unable to upload that image. Try a smaller JPG/PNG.";
      }
    }
    next();
  });
};

// Disk storage for media uploads (photos/videos from past events); capped to 50MB per file
const mediaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads/media"));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    const safeExt = ext.toLowerCase();
    const userId = req.session && req.session.user ? req.session.user.id : "anonymous";
    const timestamp = Date.now();
    cb(null, `${userId}-media-${timestamp}${safeExt}`);
  },
});

const mediaUpload = multer({
  storage: mediaStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

const uploadMedia = (req, res, next) => {
  mediaUpload.single("mediaFile")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        req.uploadError = "Media file too large (max 50MB).";
      } else {
        req.uploadError = "Unable to upload that media file. Please try again.";
      }
    }
    next();
  });
};

module.exports = {
  uploadImage,
  upload,
  uploadMedia,
};
