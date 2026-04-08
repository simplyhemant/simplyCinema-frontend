// authGuard.js
// Include this script on protected pages AFTER auth.js to enforce generic login state
(function() {
  if (typeof isLoggedIn === "function") {
    if (!isLoggedIn()) {
      console.warn("Unauthorized access attempt. Redirecting to login...");
      window.location.href = "/pages/auth/login.html";
    }
  } else {
    console.error("authGuard.js depends on auth.js. Make sure auth.js is loaded first.");
  }
})();
