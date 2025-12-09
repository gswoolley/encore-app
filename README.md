# Encore App

A simple Express + EJS app for performers with auth, profiles, availability, and a searchable directory backed by PostgreSQL. Uses Knex as the query builder.

## Prerequisites
- Node.js 18+
- PostgreSQL database (local or remote)

## Setup
1) Install deps:
```bash
npm install
```

2) Create `.env` in the project root:
```env
DB_HOST=your-db-host
DB_PORT=5432
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=your-db-name
SESSION_SECRET=change_me
PORT=3000
```

3) Create tables (run in psql or your DB tool):
```sql
CREATE TABLE IF NOT EXISTS security (
  userid SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(200) NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  performerid SERIAL PRIMARY KEY,
  userid INTEGER NOT NULL REFERENCES security(userid) ON DELETE CASCADE,
  genre VARCHAR(100),
  bio TEXT,
  availability VARCHAR(1),
  location VARCHAR(100)
);
```

4) Start the server:
```bash
npm start
```
App runs on `http://localhost:3000` (or `PORT` you set).

## Usage
- Register at `/register`, login at `/login`.
- Create your performer profile at `/profile/add`, edit at `/profile/edit`, view at `/profile`.
- Update availability at `/availability`.
- Browse/search performers at `/directory`.

## Notes
- Passwords are hashed with bcrypt.
- Sessions use the `SESSION_SECRET`; change it for production.
- If connecting to a cloud Postgres that requires SSL, adjust `db.js` accordingly.
