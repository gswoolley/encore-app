// imageUtils.js: Utility functions for choosing default avatars and building profile image URLs

const DEFAULT_AVATAR_COUNT = 11;

// Filenames present under uploads/default-avatars
const DEFAULT_AVATAR_FILES = [
  "Untitled design (48).png",
  "Untitled design (49).png",
  "Untitled design (50).png",
  "Untitled design (51).png",
  "Untitled design (52).png",
  "Untitled design (53).png",
  "Untitled design (54).png",
  "Untitled design (55).png",
  "Untitled design (56).png",
  "Untitled design (57).png",
  "Untitled design (58).png",
];

// Simple hash from string to integer
const hashString = (value) => {
  if (!value) return 0;
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const getDefaultAvatarPath = (seed) => {
  const base = hashString(seed || "default");
  const index = base % DEFAULT_AVATAR_COUNT; // 0..10
  const filename = DEFAULT_AVATAR_FILES[index] || DEFAULT_AVATAR_FILES[0];
  return `default-avatars/${filename}`;
};

// Build a web URL for a profile image given a stored path or fallback default
const buildProfileImageUrl = ({ profileImagePath, seed }) => {
  const relativePath = profileImagePath || getDefaultAvatarPath(seed);
  return `/uploads/${relativePath}`;
};

module.exports = {
  buildProfileImageUrl,
  getDefaultAvatarPath,
};
