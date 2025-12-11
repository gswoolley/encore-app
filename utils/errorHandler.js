// Helper to render errors and log server issues
const renderError = (res, message, error = null, status = 500) => {
  if (error) {
    console.error(message, error);
  } else {
    console.error(message);
  }
  res.status(status).render("error", { message, error });
};

module.exports = {
  renderError,
};
