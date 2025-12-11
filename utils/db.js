// db.js: Shared Knex instance configured from knexfile environments

// Load environment variables from the .env file
require('dotenv').config();

// Load the knexfile from the project root
const knexConfig = require('../knexfile');

// Determine which environment config to use
// Elastic Beanstalk typically sets NODE_ENV=production
const environment = process.env.NODE_ENV || 'development';

// Create Knex instance with the correct environment's settings
const knex = require('knex')(knexConfig[environment]);

// Export the configured Knex instance so models and controllers can run queries
module.exports = knex;
