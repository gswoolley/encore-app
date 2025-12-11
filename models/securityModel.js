// securityModel.js: Data access for login/registration security table (users + passwords)

const db = require("../utils/db");

// Look up a security row by email (case-insensitive)
const findByEmail = async (email) => {
  return db("security")
    .whereRaw("LOWER(email) = ?", [email.toLowerCase()])
    .first();
};

// Insert a new security row for registration
const createUser = async ({ name, email, password }) => {
  const result = await db("security")
    .insert({ name, email: email.toLowerCase(), password })
    .returning(["userid", "name", "email", "is_manager"]);
  return result[0];
};

module.exports = {
  findByEmail,
  createUser,
};
