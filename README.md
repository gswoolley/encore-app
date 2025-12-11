# Encore App

This project is an Express + EJS web app for connecting event planners with performers.
It uses PostgreSQL via Knex, session-based auth, and a simple role system (performer,
non-performer, manager).

This README is written for a TA who is grading the app while it is hosted on AWS
Elastic Beanstalk. It focuses on behavior, data model, and test logins instead of
local setup.

Group Members:
Dawson Pitcher, Jacob Harrison, Garett Woolley, and Alex Christiansen

---

## High-level user flows

### 1. Authentication
- **Register**: `/register`
  - Collects name, email, password, and whether the user wants to appear in the
    performer directory.
  - Immediately creates a matching row in `security` and a basic profile row in `users`.
- **Login**: `/login`
  - Validates email + password and stores the logged-in user in the session.
- **Logout**: `/logout`
  - Destroys the session and redirects to `/`.

After login or registration the user is sent to **`/purpose`**, where they choose
what they are here to do:

- "Find a performer" → `/directory`
- "I am a performer" → `/profile/media` (promo gallery)
- A **"Not sure where to start?"** link points to `/faq` for a short guide.

### 2. Roles

- **Non-performer user**
  - Can log in and browse the directory.
  - Has a profile/avatar but does *not* appear in the public directory.

- **Performer** (user with `is_performer = TRUE` in `users`)
  - Appears in `/directory`.
  - Has act details, location, availability, and optional media.
  - Can manage their own profile and media.

- **Manager** (user with `is_manager = TRUE` in `security`)
  - Sees a **Manager** badge next to other managers in the directory (visible only to managers).
  - When viewing a performer at `/performer/:userid`, sees:
    - **Edit user** button → `/manager/user/:userid/edit`.
    - **Make manager / Remove manager** button.
  - On the manager edit page, can:
    - Edit any user’s profile details and availability.
    - View and delete any of that user’s media items.

### 3. Performer experience

- **Profile**:
  - `/profile/add` – initial profile creation.
  - `/profile/edit` – edit act type, location, bio, performer flag, etc.
  - `/profile` – profile view.
    - If `is_performer = FALSE`, performer-only UI (act type, genre, availability
      section, availability button) is hidden.

- **Availability**:
  - `/availability` – set simple Y/N availability, shown on profile and in directory.

- **Media gallery**:
  - `/profile/media` – upload photos or short videos from the local computer.
    - Files stored under `uploads/media`.
    - Type (image vs video) inferred from MIME type.
  - Media appears under **"Past events"** on `/profile` and on the public
    performer page `/performer/:userid`.

### 4. Directory & performer view

- **Directory**: `/directory`
  - Search by name, act type, or location.
  - Shows avatar, name, email, act type, location, availability badge, and a
    140-character bio preview.
  - Clicking a card opens `/performer/:userid`.

- **Performer detail**: `/performer/:userid`
  - Public view of a single performer with:
    - Profile info (name, email, act type, details, location, availability).
    - Full bio.
    - Media gallery (images/videos the performer uploaded).
    - Email button using `mailto:`.
  - When the *viewer* is a manager, additional buttons appear to edit or promote
    the performer (see **Roles** above).

### 5. FAQ

- `/faq` – short Q&A explaining:
  - What to do after creating an account.
  - Difference between performer vs non-performer.
  - How planners find performers.
  - How performers upload media.
  - What managers can do.

This page is intended for logged-in users (linked from `/purpose`).

---

## Database schema

The app uses three main tables: `security`, `users`, and `user_media`.

### `security` (accounts)

```sql
CREATE TABLE security (
  userid       SERIAL PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  email        VARCHAR(150) UNIQUE NOT NULL,
  password     VARCHAR(200) NOT NULL,
  is_manager   BOOLEAN NOT NULL DEFAULT FALSE
);
```

- One row per account.
- `password` is a bcrypt hash.
- `is_manager` controls whether the user has manager capabilities.

### `users` (performer/non-performer profiles)

```sql
CREATE TABLE users (
  performerid        SERIAL PRIMARY KEY,
  userid             INTEGER NOT NULL REFERENCES security(userid) ON DELETE CASCADE,
  act_category       TEXT,        -- e.g. 'music', 'dj', 'comedy', 'magic', ...
  genre              TEXT,        -- free-form detail like "jazz trio", "kids magician"
  bio                TEXT,
  availability       VARCHAR(1),  -- 'Y' or 'N'
  location           TEXT,
  profile_image_path TEXT,        -- relative path under uploads/, or NULL
  is_performer       BOOLEAN NOT NULL DEFAULT FALSE
);
```

- One row per account that has created a profile.
- `is_performer` controls whether the profile appears in the directory.
- `act_category` is a coarse classification; `genre` is free text.

### `user_media` (photos/videos from past events)

```sql
CREATE TABLE user_media (
  id          SERIAL PRIMARY KEY,
  userid      INTEGER NOT NULL REFERENCES security(userid) ON DELETE CASCADE,
  media_type  TEXT NOT NULL,   -- 'image' or 'video'
  media_path  TEXT NOT NULL,   -- e.g. 'media/file-name.ext' under uploads/
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

- Each row is one uploaded media item tied to a user.
- Files live under `uploads/media`; `media_path` is the relative path under
  `/uploads` (so the URL is `/uploads/media/...`).

---

## Key routes and views (summary)

- **Auth**
  - `GET /register` → `views/register.ejs`
  - `POST /register`
  - `GET /login` → `views/login.ejs`
  - `POST /login`
  - `GET /logout`

- **Purpose & FAQ**
  - `GET /purpose` → `views/purpose.ejs`
  - `POST /purpose`
  - `GET /faq` → `views/faq.ejs`

- **Profile (current user)**
  - `GET /profile` → `views/profile.ejs`
  - `GET /profile/add` → `views/addProfile.ejs`
  - `POST /profile/add`
  - `GET /profile/edit` → `views/editProfile.ejs`
  - `POST /profile/edit`
  - `POST /profile/delete`

- **Availability (performer-only)**
  - `GET /availability` → `views/availability.ejs`
  - `POST /availability`

- **Media (current user)**
  - `GET /profile/media` → `views/profileMedia.ejs`
  - `POST /profile/media` – file upload handled by Multer

- **Directory / public performers**
  - `GET /directory` → `views/directory.ejs`
  - `GET /performer/:userid` → `views/performer.ejs`

- **Manager-only**
  - `GET /manager/user/:userid/edit` → `views/managerEditUser.ejs`
  - `POST /manager/user/:userid/edit`
  - `POST /manager/user/:userid/toggle-manager`
  - `POST /manager/user/:userid/media/:mediaId/delete`

---

## Test logins for grading

These accounts are intended to make grading easier. Passwords shown here are the
plaintext values you can use to log in (the DB stores only hashes).

- **Manager account**
  - Email: `Ava.thompson@example.com`
  - Password: `hashedpassword123`
  - Role: manager (`is_manager = TRUE`) and performer.

- **Regular user account**
  - Email: `mia.carter@example.com`
  - Password: `hashedpassword456`
  - Role: non-manager; may be either performer or non-performer depending on DB seed.

These users should already exist in the grading database with the proper flags set
(`security.is_manager`, `users.is_performer`).

---

## Notes for TA

- All user-visible pages share a common header and footer (Bootstrap 5 + custom CSS
  in `public/css/app.css`).
- Auth is session-based using `express-session`; `authMiddleware` protects all
  non-public routes.
- File uploads are handled by Multer and stored under `/uploads/profile-images` and
  `/uploads/media`, which are exposed via `app.use("/uploads", express.static(...))`.
- Manager-only functionality is enforced in middleware (`ensureManager`) and not
  exposed to regular users in the UI.
