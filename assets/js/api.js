// NOTE: Backend CORS is currently configured with wildcard (*).
// If you get CORS errors, add your frontend origin to the backend's
// CorsConfig.java allowedOrigins list.

// const BASE_URL = "https://autos-antibody-usgs-tribune.trycloudflare.com";  // Deployed AWS Backend URL , cloudflare
// const BASE_URL = "https://simplyhemant.duckdns.org";  // Secure AWS Backend via DuckDNS
const BASE_URL = "http://localhost:8080";  // Local Backend

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

async function apiCall(method, endpoint, body = null, isPublic = false, extraOptions = {}) {
  showLoader();
  try {
    const options = { method, headers: getHeaders(isPublic), ...extraOptions };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(`${BASE_URL}${endpoint}`, options);
    if (res.status === 401) { logout(); return null; }
    if (res.status === 403) { showToast("You don't have permission", "error"); return null; }
    if (res.status === 409) {
      const err = await res.json().catch(() => ({}));
      showToast(err.message || "Cannot deactivate staff member who is currently on duty", "error");
      return null;
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showToast(err.message || "Something went wrong", "error");
      return null;
    }

    // Handle successful responses (200, 204 etc)
    if (res.status === 204) return true;

    const text = await res.text();
    if (!text) return true; // Empty 200 response

    try {
      return JSON.parse(text);
    } catch (e) {
      return text; // Return as text if not JSON
    }
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
    return await apiCall("GET", `/api/movies/all?pageNo=${p}&pageSize=${s}`);
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
  getNowShowing: async (cityId = null, pageNo = 0, pageSize = 100) => {
    let url = `/api/movies/now-showing?pageNo=${pageNo}&pageSize=${pageSize}`;
    if (cityId) url += `&cityId=${cityId}`;
    return await apiCall("GET", url);
  },
  // GET /api/movies/upcoming
  getUpcoming: async (pageNo = 0, pageSize = 100) => {
    return await apiCall("GET", `/api/movies/upcoming?pageNo=${pageNo}&pageSize=${pageSize}`);
  },
  // GET /api/movies/genre/{id}
  getByGenre: async (genreId, pageNo = 0, pageSize = 100) => {
    return await apiCall("GET", `/api/movies/genre/${genreId}?pageNo=${pageNo}&pageSize=${pageSize}`);
  },
};

const Genres = {
  getAll: () => apiCall("GET", "/api/genres/all"),
};

const Languages = {
  getAll: () => apiCall("GET", "/api/languages/all"),
};

const Formats = {
  getAll: () => apiCall("GET", "/api/formats"),
};

const Shows = {
  // Get shows by movie: GET /api/show/movies/{movieId}?languageId=...&formatId=...
  getByMovie: (movieId, langId = null, formatId = null, cityId = null, date = null) => {
    let url = `/api/show/movies/${movieId}`;
    const params = [];
    if (langId) params.push(`languageId=${langId}`);
    if (formatId) params.push(`formatId=${formatId}`);
    if (cityId) params.push(`cityId=${cityId}`);
    if (date) params.push(`date=${date}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    return apiCall("GET", url);
  },

  // Alias for backward compat
  query: (movieId, cityId, date, langId = null, formatId = null) => Shows.getByMovie(movieId, langId, formatId, cityId, date),

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

  // GET /api/show/movies/{movieId}/filters?cityId=...
  getAvailableFilters: (movieId, cityId = null) => {
    let url = `/api/show/movies/${movieId}/filters`;
    if (cityId) url += `?cityId=${cityId}`;
    return apiCall("GET", url);
  }
};

const Theatres = {
  getById: (id) => apiCall("GET", `/api/theatre/${id}`),
  getByCity: (cityId) => apiCall("GET", `/api/theatre/city/${cityId}`),
  getAll: async (pageNo = 0, pageSize = 100) => {
    const res = await apiCall("GET", `/api/theatre/list?pageNo=${pageNo}&pageSize=${pageSize}`);
    return res?.content || res || [];
  },
  getByOwner: (ownerId) => apiCall("GET", `/api/theatre/owner/list/${ownerId}`),
  create: (data) => apiCall("POST", `/api/theatre/owner/create`, data),
  update: (id, data) => apiCall("PUT", `/api/theatre/owner/update/${id}`, data),
  delete: (id) => apiCall("DELETE", `/api/theatre/owner/delete/${id}`),
  activate: (id) => apiCall("PATCH", `/api/theatre/owner/${id}/activate`),
  deactivate: (id) => apiCall("PATCH", `/api/theatre/owner/${id}/deactivate`),
  search: (keyword) => apiCall("GET", `/api/theatre/search?keyword=${encodeURIComponent(keyword)}`)
};

const Screens = {
  getByTheatre: (theatreId) => apiCall("GET", `/api/screens/theatre/${theatreId}`),
  getById: (id) => apiCall("GET", `/api/screens/${id}`),
  create: (data) => apiCall("POST", "/api/screens/create", data),
  update: (id, data) => apiCall("PUT", `/api/screens/update/${id}`, data),
  delete: (id) => apiCall("DELETE", `/api/screens/${id}`),
  activate: (id) => apiCall("PATCH", `/api/screens/owner/${id}/activate`),
  deactivate: (id) => apiCall("PATCH", `/api/screens/owner/${id}/deactivate`)
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
  releaseSeats: (showId, seatIds, options = {}) => apiCall("POST", "/api/bookings/release", { showId, seatIds }, false, options),

  // GET /api/bookings/locked/show/{showId}
  getLockedSeats: (showId) => apiCall("GET", `/api/bookings/locked/show/${showId}`),

  // GET /api/bookings/verify/{reference}
  verify: (reference) => apiCall("GET", `/api/bookings/verify/${reference}`),

  // GET /api/bookings/{bookingId}
  getDetails: (id) => apiCall("GET", `/api/bookings/${id}`)
};

const User = {
  getProfile: () => apiCall("GET", "/api/user/profile"),
  updateProfile: (data) => apiCall("PUT", "/api/user/profile/update", data),
  getPreferences: () => apiCall("GET", "/api/user/preferences"),
  updatePreferences: (data) => apiCall("PUT", "/api/user/preferences/update", data),
};

const Cities = {
  getAll: () => apiCall("GET", "/api/cities/all"),
  getActive: () => apiCall("GET", "/api/cities/active"),
  search: (keyword) => apiCall("GET", `/api/cities/search?keyword=${encodeURIComponent(keyword)}`),
  create: (data) => apiCall("POST", "/api/cities/create", data),
  update: (id, data) => apiCall("PUT", `/api/cities/update/${id}`, data),
  delete: (id) => apiCall("DELETE", `/api/cities/delete/${id}`),
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
  // Stats
  getStats: () => apiCall("GET", "/admin/stats"),
  getOwnerStats: (ownerId) => apiCall("GET", `/admin/stats/owner/${ownerId}`),

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

const CounterStaff = {
  registerInitiate: (data) => apiCall("POST", "/api/v1/counter-staff/register/initiate", data),
  verifyRegistration: (data) => apiCall("POST", "/api/v1/counter-staff/register/verify", data),
  update: (id, data) => apiCall("PUT", `/api/v1/counter-staff/${id}`, data),
  getById: (id) => apiCall("GET", `/api/v1/counter-staff/${id}`),
  getAllByTheatre: (theatreId) => apiCall("GET", `/api/v1/counter-staff/theatre/${theatreId}`),
  deactivate: (id) => apiCall("DELETE", `/api/v1/counter-staff/${id}/deactivate`),
  activate: (id) => apiCall("PATCH", `/api/v1/counter-staff/${id}/activate`),
  updateDutyStatus: (id, isOnDuty) => apiCall("PATCH", `/api/v1/counter-staff/${id}/duty-status?isOnDuty=${isOnDuty}`),
  createBooking: (data) => apiCall("POST", "/api/v1/counter-staff/create/booking", data),
  getMyProfile: () => apiCall("GET", "/api/v1/counter-staff/profile"),
};
