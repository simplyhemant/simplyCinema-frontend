# SimplyCinema - Frontend

A modern, responsive movie ticket booking experience built with standard HTML5, CSS3 (Tailwind CSS), and Vanilla JavaScript.

---

## 🔗 Project Links

| Type | Link |
| :--- | :--- |
| **🚀 Live Demo** | [Add Live Vercel URL Here] |
| **🌐 Backend API** | [Add AWS Backend URL Here] |
| **📘 API Documentation** | [Add AWS Backend URL Here]/swagger-ui/index.html |
| **⚙️ Swagger JSON** | [Add AWS Backend URL Here]/v3/api-docs |

---

## ✨ Features

- **Dynamic Hero Banner**: Auto-rotating featured movies with trailers.
- **Movie Browsing**: Filter by category (Movies, Events, Plays, Sports).
- **Smooth Navigation**: Glassmorphic UI with modern transitions.
- **Seat Selection**: Interactive seat mapping for movie shows.
- **Booking Flow**: Multi-step checkout process with Razorpay integration.
- **User Authentication**: Email/Password and OTP-based authentication.

---

## 🛠️ Technology Stack

- **Styling**: Tailwind CSS (CDN-based for quick prototyping)
- **Icons**: Material Symbols Outlined
- **Typography**: Space Grotesk (Headline), Inter (Body)
- **Logic**: Vanilla JavaScript
- **API calls**: Fetch API with `Authorization: Bearer` token handling.

---

## 🚀 Deployment (Vercel)

This frontend is designed to be deployed as a static site on Vercel.

1. **Prerequisites**: Ensure the Backend is running on AWS.
2. **Configuration**: Update `assets/js/api.js` with your production `BASE_URL`.
3. **Deploy**: 
   - Push this repository to GitHub.
   - Connect the repository to Vercel.
   - Vercel will automatically detect the static files and serve `index.html`.

---

## 📂 Project Structure

```text
simplyCinema-frontend/
├── assets/
│   ├── css/        # Stylesheets
│   ├── js/         # Logic (api.js, auth.js, utils.js)
│   └── images/     # Static assets
├── components/     # Reusable HTML snippets (navbar, footer)
├── pages/          # Specific routes (customer, admin paths)
├── index.html      # Landing page
└── README.md       # This file
```

---


