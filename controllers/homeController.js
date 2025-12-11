// Redirect root to login screen
const root = (req, res) => {
  res.redirect("/login");
};

// Static FAQ page for logged-in users
const showFaq = (req, res) => {
  res.render("faq");
};

// Ask user what they are here to do (find performers vs perform)
const showPurpose = (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  res.render("purpose");
};

// Redirect based on chosen purpose selection
const handlePurpose = (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  const { purpose } = req.body;
  if (purpose === "find") {
    return res.redirect("/directory");
  }
  if (purpose === "perform") {
    return res.redirect("/profile/media");
  }
  return res.redirect("/dashboard");
};

// Generic success page with optional custom message
const success = (req, res) => {
  const message = req.query.message || "Action completed successfully.";
  res.render("success", { message });
};

module.exports = {
  root,
  showFaq,
  showPurpose,
  handlePurpose,
  success,
};
