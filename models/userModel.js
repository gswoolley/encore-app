const db = require("../db");

// Fetch a subset of profile fields for the logged-in user
const getProfileSummaryByUserId = async (userId, columns) => {
  return db("users").select(columns).where("userid", userId).first();
};

// Join security + users for a full profile view
const getProfileWithSecurityByUserId = async (userId, columns) => {
  return db("security as s")
    .leftJoin("users as u", "u.userid", "s.userid")
    .select(columns)
    .where("s.userid", userId)
    .first();
};

// Read raw users row for a given userid
const getUserRowById = async (userId, columns) => {
  return db("users").select(columns).where("userid", userId).first();
};

// Check if a users row already exists for this account
const getExistingPerformerByUserId = async (userId) => {
  return db("users").select("performerid").where("userid", userId).first();
};

// Create a new users profile row
const createProfile = async (data) => {
  return db("users").insert(data);
};

// Update an existing users profile row
const updateProfile = async (userId, updateData) => {
  return db("users").where("userid", userId).update(updateData);
};

// Delete profile for a given userid
const deleteProfileByUserId = async (userId) => {
  return db("users").where("userid", userId).del();
};

// Get Y/N availability flag for a user
const getAvailabilityByUserId = async (userId) => {
  return db("users").select("availability").where("userid", userId).first();
};

// Update availability for a user
const updateAvailabilityByUserId = async (userId, availability) => {
  return db("users").where("userid", userId).update({ availability });
};

// Directory query: list performers, with optional search term
const getDirectoryPerformers = async (columns, term) => {
  return db("users as u")
    .join("security as s", "s.userid", "u.userid")
    .select(columns)
    .where("u.is_performer", true)
    .modify((query) => {
      if (term) {
        query.whereRaw(
          "(LOWER(s.name) LIKE ? OR LOWER(u.act_category) LIKE ? OR LOWER(u.genre) LIKE ? OR LOWER(u.location) LIKE ?)",
          [`%${term}%`, `%${term}%`, `%${term}%`, `%${term}%`]
        );
      }
    })
    .orderByRaw("LOWER(s.name) ASC");
};

module.exports = {
  getProfileSummaryByUserId,
  getProfileWithSecurityByUserId,
  getUserRowById,
  getExistingPerformerByUserId,
  createProfile,
  updateProfile,
  deleteProfileByUserId,
  getAvailabilityByUserId,
  updateAvailabilityByUserId,
  getDirectoryPerformers,
};
