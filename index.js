//npm install dotenv - explain
//npm install express-session - explain
//create the .env file

// Load environment variables from .env file into memory
// Allows you to use process.env
require("dotenv").config();

const express = require("express");

//Needed for the session variable - Stored on the server to hold data
const session = require("express-session");

let path = require("path");

// Allows you to read the body of incoming HTTP requests and makes that data available on req.body
let bodyParser = require("body-parser");

let app = express();

// Use EJS for the web pages - requires a views folder and all files are .ejs
app.set("view engine", "ejs");

// process.env.PORT is when you deploy and 3000 is for test
const port = process.env.PORT || 3000;

/* Session middleware (Middleware is code that runs between the time the request comes
to the server and the time the response is sent back. It allows you to intercept and
decide if the request should continue. It also allows you to parse the body request
from the html form, handle errors, check authentication, etc.)

REQUIRED parameters for session:
secret - The only truly required parameter
    Used to sign session cookies
    Prevents tampering and session hijacking with session data

OPTIONAL (with defaults):
resave - Default: true
    true = save session on every request
    false = only save if modified (recommended)

saveUninitialized - Default: true
    true = create session for every request
    false = only create when data is stored (recommended)
*/

app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback-secret-key",
    resave: false,
    saveUninitialized: false,
  })
);

// Tells Express how to read form data sent in the body of a request
app.use(express.urlencoded({ extended: true }));

// Global authentication middleware - runs on EVERY request
app.use((req, res, next) => {
  // Skip authentication for login routes
  if (req.path === "/" || req.path === "/login" || req.path === "/logout") {
    //continue with the request path
    return next();
  }

  // Check if user is logged in for all other routes
  if (req.session.isLoggedIn) {
    //notice no return because nothing below it
    next(); // User is logged in, continue
  } else {
    res.render("login", { error_message: "Please log in to access this page" });
  }
});

// Main page route - notice it checks if they have logged in
app.get("/", (req, res) => {
  // Check if user is logged in
  if (req.session.isLoggedIn) {
    res.render("index");
  } else {
    res.render("login", { error_message: "" });
  }
});

// This creates attributes in the session object to keep track of user and if they logged in
app.post("/login", (req, res) => {
  let sName = req.body.username;
  let sPassword = req.body.password;

  if (sName == "GREG" && sPassword == "ADMIN") {
    // Set session variables
    req.session.isLoggedIn = true;
    req.session.username = sName;
    res.redirect("/");
  } else {
    res.render("login", { error_message: "Invalid login" });
  }
});

// Logout route
app.get("/logout", (req, res) => {
  // Get rid of the session object
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
    }
    res.redirect("/");
  });
});

app.get("/t", (req, res) => {
  res.render("test");
});

// Catch-all route for any other protected pages
app.get("*", (req, res) => {
  res.render("index");
});

app.listen(port, () => {
  console.log("The server is listening");
});
