function decodeToken(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch(e) { 
    console.error("JWT Decode Error:", e);
    return null; 
  }
}

// JWT payload has { roles: ["ROLE_CUSTOMER", "ROLE_ADMIN", ...] }
function getRole() {
  const token = localStorage.getItem("sc_token");
  if (!token) return null;
  const payload = decodeToken(token);
  if (!payload || !payload.roles) return null;
  
  // Backend stores roles as ["ROLE_CUSTOMER", ...], strip the ROLE_ prefix
  const roles = payload.roles || [];
  if (roles.length === 0) return null;
  
  // Clean up roles array
  const cleanRoles = roles.map(r => r.replace("ROLE_", ""));

  // Prioritize the highest privilege role for UI rendering
  if (cleanRoles.includes("ADMIN")) return "ADMIN";
  if (cleanRoles.includes("THEATRE_OWNER")) return "THEATRE_OWNER";
  if (cleanRoles.includes("THEATRE_STAFF")) return "THEATRE_STAFF";
  if (cleanRoles.includes("COUNTER_STAFF")) return "COUNTER_STAFF";
  
  // Default fallback if no elevated privileges
  return cleanRoles[0];
}

function getAllRoles() {
  const token = localStorage.getItem("sc_token");
  if (!token) return [];
  const payload = decodeToken(token);
  if (!payload) return [];
  const roles = payload.roles || [];
  return roles.map(r => r.replace("ROLE_", ""));
}

function isLoggedIn() {
  const token = localStorage.getItem("sc_token");
  if (!token) return false;
  const payload = decodeToken(token);
  if (!payload || !payload.exp) return false;
  
  // Standard JWT 'exp' is in seconds
  const currentTime = Math.floor(Date.now() / 1000);
  return currentTime < payload.exp;
}

async function logout() {
  try {
    if (typeof Auth !== 'undefined' && Auth.logout) {
      // Allow backend to blacklist the token
      await apiCall("POST", "/api/auth/logout", null, false);
    }
  } catch(e) {}
  
  localStorage.removeItem("sc_token");
  localStorage.removeItem("sc_user");
  localStorage.removeItem("sc_city");
  sessionStorage.removeItem("sc_booking");
  window.location.href = "/pages/auth/login";
}

// Role-based guard.  allowedRoles is optional array of role strings
// e.g. requireRole(["ADMIN"]) or requireRole(["ADMIN", "THEATRE_OWNER"])
function requireRole(allowedRoles) {
  if (!isLoggedIn()) { logout(); return; }
  const role = getRole();
  if (!allowedRoles.includes(role)) {
    showToast("Access denied", "error");
    window.location.href = "/";
  }
}

// General auth guard. If allowedRoles array provided, also checks role.
// If called with no args (requireAuth()), just checks login.
function requireAuth(allowedRoles) {
  if (!isLoggedIn()) { logout(); return; }
  if (allowedRoles && allowedRoles.length > 0) {
    const role = getRole();
    if (!allowedRoles.includes(role)) {
      showToast("Access denied", "error");
      window.location.href = "/";
    }
  }
}

// On login success: decode role and redirect
function getSession() {
  return JSON.parse(localStorage.getItem("sc_user") || "{}");
}

async function redirectByRole() {
  const role = getRole();
  console.log("Detected role for redirect:", role);
  
  // Sync user profile for Navbar initial/details
  try {
    if (typeof User !== 'undefined' && User.getProfile) {
      const profile = await User.getProfile();
      if (profile) {
        localStorage.setItem("sc_user", JSON.stringify(profile));
      }
    }
  } catch (e) {
    console.error("Profile sync failed during redirect, continuing...", e);
  }

  const routes = {
    CUSTOMER:      "/",
    ADMIN:         "/pages/admin/dashboard.html",
    THEATRE_OWNER: "/pages/owner/dashboard.html",
    THEATRE_STAFF: "/pages/staff/dashboard.html",
  };

  // Fallback to Home if role is missing or unknown
  const target = routes[role] || "/";
  console.log("Final redirecting to target:", target);
  
  // Use replace to prevent back-button loops in auth flow
  window.location.replace(target);
}

/**
 * STRICT ROLE ACCESS GUARD
 * Prevents THEATRE_STAFF from accessing customer/owner/admin pages.
 * Should be called on every page that is NOT a staff dashboard.
 */
function enforceStaffRestriction() {
  if (!isLoggedIn()) return;
  const role = getRole();
  const path = window.location.pathname;

  // If staff member is trying to access anything that isn't their portal or logout
  if (role === 'THEATRE_STAFF') {
     const isStaffPage = path.includes('/pages/staff/') || path.includes('/pages/auth/login');
     if (!isStaffPage) {
        console.warn("Staff access restricted - redirecting to console.");
        window.location.replace("/pages/staff/dashboard.html");
     }
  }
}
