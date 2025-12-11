// knexfile.js
// Centralized Knex configuration for different environments. This file is
// consumed by both the CLI (npx knex ...) and the app's util/db module.
require('dotenv').config();

module.exports = {
  // Local development database configuration. Uses environment variables
  // defined in .env (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT).
  development: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 5432,
      ssl: { rejectUnauthorized: false },
    },
  },

  // Production configuration for AWS RDS. Elastic Beanstalk populates the
  // RDS_* environment variables when you attach an RDS instance to the
  // environment. SSL is enabled but the certificate check is relaxed so
  // self-signed/managed certificates do not break the connection.
  production: {
    client: 'pg',
    connection: {
      host: process.env.RDS_HOSTNAME,
      user: process.env.RDS_USERNAME,
      password: process.env.RDS_PASSWORD,
      database: process.env.RDS_DB_NAME,
      port: process.env.RDS_PORT || 5432,
      ssl: { rejectUnauthorized: false },
    },
  },
};
