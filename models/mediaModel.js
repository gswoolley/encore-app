// mediaModel.js: Data access helpers for uploaded user media records

const db = require("../utils/db");

// Get all media for a user (newest first)
const getMediaByUserId = (userid) => {
  return db("user_media").where({ userid }).orderBy("created_at", "desc");
};

// Get a single media record by id
const getMediaById = (id) => {
  return db("user_media").where({ id }).first();
};

// Add a media record
const addMedia = (data) => {
  return db("user_media").insert(data);
};

// Delete a media record by id
const deleteMediaById = (id) => {
  return db("user_media").where({ id }).del();
};

module.exports = {
  getMediaByUserId,
  getMediaById,
  addMedia,
  deleteMediaById,
};
