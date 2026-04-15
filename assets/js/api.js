// NOTE: Backend CORS is currently configured with wildcard (*).
// If you get CORS errors, add your frontend origin to the backend's
// CorsConfig.java allowedOrigins list.

// const BASE_URL = "http://localhost:8080"; 
// const BASE_URL = "https://autos-antibody-usgs-tribune.trycloudflare.com";  // Deployed AWS Backend URL , cloudflare
const BASE_URL = "https://simplyhemant.duckdns.org";

function getHeaders(isPublic = false) {
  const headers = {
    "Content-Type": "application/json",
    "Accept": "application/json"
  };
  if (!isPublic) {
    const token = localStorage.getItem("sc_token");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function apiCall(method, endpoint, body = null, isPublic = false) {
  showLoader();
  try {
    const options = { method, headers: getHeaders(isPublic) };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(`${BASE_URL}${endpoint}`, options);
    if (res.status === 401) { logout(); return null; }
    if (res.status === 403) { showToast("You don't have permission", "error"); return null; }
    if (res.status === 409) { showToast("Seats just got taken! Please re-select.", "error"); return null; }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showToast(err.message || "Something went wrong", "error");
      return null;
    }
    return res.status === 204 ? true : res.json();
  } catch (e) {
    showToast("Connection failed. Check your internet.", "error");
    return null;
  } finally {
    hideLoader();
  }
}

// Named exports for each domain
const Auth = {
  // Direct login with email/password
  login: async (email, password) => {
    const res = await apiCall("POST", "/api/auth/login", { email, password }, true);
    if (res && res.jwt) {
      localStorage.setItem("sc_token", res.jwt);
    }
    return res;
  },

  // Phase 1.1: Direct Signup with Password
  register: async (data) => {
    const res = await apiCall("POST", "/api/auth/signup/pass", data, true);
    if (res && res.jwt) {
      localStorage.setItem("sc_token", res.jwt);
      const profile = await User.getProfile();
      if (profile) localStorage.setItem("sc_user", JSON.stringify(profile));
    }
    return res;
  },

  // Phase 1.2: OTP Registration
  // Step 1: Send OTP for Registration
  sendSignupOtp: async (data) => {
    // Uses the dedicated registration initiation endpoint which validates email/phone existence
    return await apiCall("POST", "/api/auth/register", data, true);
  },

  // Step 2: Verify OTP and Register
  verifyOtpAndRegister: async (data) => {
    // Phase 1 endpoint: /api/auth/verify-otp (matches with /api/auth/register)
    // payload: { email, otp }
    const res = await apiCall("POST", "/api/auth/verify-otp", data, true);
    if (res && res.jwt) {
      localStorage.setItem("sc_token", res.jwt);
    }
    return res;
  },

  // OTP Login: Send OTP to Email
  sendEmailOtp: (email) => apiCall("POST", "/api/auth/send-otp/email", { email }, true),

  // OTP Login: Send OTP to Phone
  sendPhoneOtp: (phone) => apiCall("POST", "/api/auth/send-otp/phone", { phone }, true),

  // OTP Login: Verify and Login (Email OTP)
  loginWithEmailOtp: async (email, otp) => {
    const res = await apiCall("POST", "/api/auth/login/email-otp", { email, otp }, true);
    if (res && res.jwt) {
      localStorage.setItem("sc_token", res.jwt);
    }
    return res;
  },

  // OTP Login: Verify and Login (Phone OTP)
  loginWithPhoneOtp: async (phone, otp) => {
    const res = await apiCall("POST", "/api/auth/login/phone-otp", { phone, otp }, true);
    if (res && res.jwt) {
      localStorage.setItem("sc_token", res.jwt);
    }
    return res;
  },

  // Resend OTP (for registration flow)
  resendOtp: async (email) => {
    return await apiCall("POST", "/api/auth/resend-otp", { email }, true);
  },

  // Forgot Password: Send Link
  forgotPassword: async (email) => {
    return await apiCall("POST", "/api/auth/forgot-password", { email }, true);
  },

  // Reset Password: Using Token
  resetPassword: async (token, newPassword) => {
    return await apiCall("POST", `/api/auth/reset-password?token=${token}&newPassword=${newPassword}`, null, true);
  },

  logout: async () => {
    try {
      const token = localStorage.getItem("sc_token");
      if (token) {
        await apiCall("POST", "/api/auth/logout", null, false);
      }
    } catch (e) { }
    localStorage.removeItem("sc_token");
    localStorage.removeItem("sc_user");
    localStorage.removeItem("sc_city");
    const isSubdir = window.location.pathname.includes('/simplyCinema-frontend/');
    window.location.href = isSubdir ? '/simplyCinema-frontend/' : '/';
  },

  // OAuth2 Token Extractor Helper (To be called on page load in login pages)
  handleOAuth2Redirect: () => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      localStorage.setItem("sc_token", token);
      // Clean up the URL so the token isn't sitting in the address bar
      window.history.replaceState({}, document.title, window.location.pathname);
      return true;
    }
    return false;
  }
};

const Movies = {
  // GET /api/movies/all?pageNo=0&pageSize=100 — returns Page object { content: [...] }
  getAll: async (pageNo = 0, pageSize = 100) => {
    // Ensure we don't send "null" strings to the backend
    const p = (pageNo === null || isNaN(pageNo)) ? 0 : pageNo;
    const s = (pageSize === null || isNaN(pageSize)) ? 100 : pageSize;
    const res = await apiCall("GET", `/api/movies/all?pageNo=${p}&pageSize=${s}`);
    return res?.content || res || [];
  },
  // GET /api/movies/{movieId}
  getById: (id) => apiCall("GET", `/api/movies/${id}`),
  // POST /api/movies/create
  create: (data) => apiCall("POST", "/api/movies/create", data),
  // PUT /api/movies/update/{movieId}
  update: (id, data) => apiCall("PUT", `/api/movies/update/${id}`, data),
  // DELETE /api/movies/delete/{movieId}
  delete: (id) => apiCall("DELETE", `/api/movies/delete/${id}`),
  // GET /api/movies/search?keyword=...
  search: (keyword) => apiCall("GET", `/api/movies/search?keyword=${encodeURIComponent(keyword)}`),
  // GET /api/movies/now-showing
  getNowShowing: async (pageNo = 0, pageSize = 100) => {
    const res = await apiCall("GET", `/api/movies/now-showing?pageNo=${pageNo}&pageSize=${pageSize}`);
    return res?.content || res || [];
  },
  // GET /api/movies/upcoming
  getUpcoming: async (pageNo = 0, pageSize = 100) => {
    const res = await apiCall("GET", `/api/movies/upcoming?pageNo=${pageNo}&pageSize=${pageSize}`);
    return res?.content || res || [];
  },
  // GET /api/movies/genre/{id}
  getByGenre: async (genreId, pageNo = 0, pageSize = 100) => {
    const res = await apiCall("GET", `/api/movies/genre/${genreId}?pageNo=${pageNo}&pageSize=${pageSize}`);
    return res?.content || res || [];
  },
};

const Genres = {
  getAll: () => apiCall("GET", "/api/genres/all"),
};

const Languages = {
  getAll: () => apiCall("GET", "/api/languages/all"),
};

const Shows = {
  // Get shows by movie: GET /api/show/movies/{movieId}
  getByMovie: (movieId) => apiCall("GET", `/api/show/movies/${movieId}`),

  // Alias for backward compat — ignores cityId/date, fetches all shows for a movie
  query: (movieId, cityId, date) => apiCall("GET", `/api/show/movies/${movieId}`),

  // GET /api/show/{id}
  getById: (id) => apiCall("GET", `/api/show/${id}`),

  // Get seats for a show: GET /api/show-seats/{showId}
  getSeats: (showId) => apiCall("GET", `/api/show-seats/${showId}`),

  // POST /api/show/create
  create: (data) => apiCall("POST", "/api/show/create", data),

  // GET /api/show/theatres/{theatreId}
  getByTheatre: (theatreId) => apiCall("GET", `/api/show/theatres/${theatreId}`),

  // PUT /api/show/update/{id}
  update: (id, data) => apiCall("PUT", `/api/show/update/${id}`, data),

  // DELETE /api/show/delete/{id}
  delete: (id) => apiCall("DELETE", `/api/show/delete/${id}`),
};

const Theatres = {
  getById: (id) => apiCall("GET", `/api/theatre/${id}`),
  getByCity: (cityId) => apiCall("GET", `/api/theatre/city/${cityId}`),
  getAll: async (pageNo = 0, pageSize = 100) => {
    const res = await apiCall("GET", `/api/theatre/list?pageNo=${pageNo}&pageSize=${pageSize}`);
    return res?.content || res || [];
  },
  search: (keyword) => apiCall("GET", `/api/theatre/search?keyword=${encodeURIComponent(keyword)}`)
};

const Screens = {
  getByTheatre: (theatreId) => apiCall("GET", `/api/screens/theatre/${theatreId}`),
  getById: (id) => apiCall("GET", `/api/screens/${id}`),
};

const Bookings = {
  // POST /api/bookings/create — body: BookingDto (includes showId, seatIds, etc.)
  create: (showId, seatIds) => apiCall("POST", "/api/bookings/create", { showId, seatIds }),

  // POST /api/bookings/confirm — body: BookingDto with Razorpay fields
  confirm: (data) => apiCall("POST", "/api/bookings/confirm", data),

  // GET /api/bookings/user/{userId} — fetch booking history
  getHistory: (userId) => apiCall("GET", `/api/bookings/user/${userId}`),

  // POST /api/bookings/lock
  lockSeats: (showId, seatIds) => apiCall("POST", "/api/bookings/lock", { showId, seatIds }),

  // POST /api/bookings/release
  releaseSeats: (showId, seatIds) => apiCall("POST", "/api/bookings/release", { showId, seatIds }),

  // GET /api/bookings/locked/show/{showId}
  getLockedSeats: (showId) => apiCall("GET", `/api/bookings/locked/show/${showId}`)
};

const User = {
  getProfile: () => apiCall("GET", "/api/user/profile"),
  updateProfile: (data) => apiCall("PUT", "/api/user/profile/update", data),
  getPreferences: () => apiCall("GET", "/api/user/preferences"),
  updatePreferences: (data) => apiCall("PUT", "/api/user/preferences/update", data),
};

const Cities = {
  getAll: () => apiCall("GET", "/api/cities/active"),
  search: (keyword) => apiCall("GET", `/api/cities/search?keyword=${encodeURIComponent(keyword)}`),
};

const Reviews = {
  // GET /api/reviews/{movieId}
  getByMovie: (movieId) => apiCall("GET", `/api/reviews/${movieId}`),

  // GET /api/reviews/{movieId}/average-rating
  getAverageRating: (movieId) => apiCall("GET", `/api/reviews/${movieId}/average-rating`),

  // POST /api/reviews/movies/{movieId}
  submit: (movieId, data) => apiCall("POST", `/api/reviews/movies/${movieId}`, data),
};

const Support = {
  create: (data) => apiCall("POST", "/api/support/create", data),
  getAll: () => apiCall("GET", "/api/support/all"),
  getUserTickets: (userId) => apiCall("GET", `/api/support/user/${userId}`),
  updateStatus: (id, status, isResolved) => apiCall("PUT", `/api/support/update/${id}?status=${encodeURIComponent(status)}&isResolved=${isResolved}`),
  getById: (id) => apiCall("GET", `/api/support/${id}`)
};

const Admin = {
  // User Management
  getUsers: () => apiCall("GET", "/admin/all/users"),
  getUserById: (id) => apiCall("GET", `/admin/user/${id}`),
  getUserRoles: (userId) => apiCall("GET", `/admin/user-role/${userId}`),
  toggleUserStatus: (userId, isActive) => apiCall("PATCH", `/admin/user/${userId}/toggle-status?isActive=${isActive}`),

  // Role Management
  assignRole: (userId, roleName) => apiCall("POST", `/admin/assign?userId=${userId}&roleName=${encodeURIComponent(roleName)}`),
  deleteRole: (roleId) => apiCall("DELETE", `/admin/${roleId}`),

  // Movies Management (Proxially handled by Admin role in some pages)
  addMovie: (data) => apiCall("POST", "/api/movies/create", data),
  updateMovie: (id, data) => apiCall("PUT", `/api/movies/update/${id}`, data),
  deleteMovie: (id) => apiCall("DELETE", `/api/movies/delete/${id}`),
};
