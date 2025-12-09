# Encore App

A simple Express + EJS app for performers with auth, profiles, availability, and a searchable directory backed by PostgreSQL.

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
DB_HOST=awseb-e-scmsa2yquz-stack-awsebrdsdatabase-8jcysuidobdo.c4raiiwyiy3q.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=byubluebanana
DB_NAME=ebdb
SESSION_SECRET=19384yjhfesas4||super_secret_session_key
PORT=3016
```

3) Start the server:
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
- If connecting to a cloud Postgres that requires SSL, adjust `db.js` accordingly.***
