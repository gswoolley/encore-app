require("dotenv").config();
const knex = require("knex");

// Shared Knex instance for talking to the Postgres database
const db = knex({
  client: "pg",
  connection: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
      rejectUnauthorized: false,
    },
  },
  pool: { min: 0, max: 10 },
});

module.exports = db;
