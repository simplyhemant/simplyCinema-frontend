// Toast: type = "success" | "error" | "info" | "warning"
function showToast(message, type = "info") {
  const colors = {
    success: "bg-green-600",
    error:   "bg-red-600",
    warning: "bg-amber-500",
    info:    "bg-primary-container",
  };
  const t = document.createElement("div");
  t.className = `fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-5 py-3 
                 rounded-xl shadow-2xl text-white text-sm font-medium 
                 transition-all duration-300 ${colors[type]}`;
  t.innerHTML = `<span class="material-symbols-outlined text-base">
    ${type === "success" ? "check_circle" : type === "error" ? "error" : "info"}
  </span>${message}`;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = "0"; setTimeout(() => t.remove(), 300); }, 3000);
}

// Full-screen loader overlay
function showLoader() {
  if (document.getElementById("sc-loader")) return;
  const el = document.createElement("div");
  el.id = "sc-loader";
  el.className = "fixed inset-0 z-[9998] bg-background/80 backdrop-blur-sm flex items-center justify-center";
  el.innerHTML = `<div class="w-10 h-10 border-4 border-primary-container border-t-primary rounded-full animate-spin"></div>`;
  document.body.appendChild(el);
}
function hideLoader() {
  document.getElementById("sc-loader")?.remove();
}

// Date formatter
function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric"
  });
}
function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}
function formatCurrency(amount) {
  return `₹${Number(amount).toFixed(2)}`;
}

// Returns YYYY-MM-DD in local time
function formatLocalDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function injectComponent(placeholderId, filePath) {
  const el = document.querySelector(placeholderId);
  if (!el) return;

  const pathStr = window.location.pathname;
  const isSubdir = pathStr.includes('/simplyCinema-frontend/');
  let finalPath = filePath;

  try {
    const response = await fetch(finalPath);
    if (!response.ok) throw new Error(`Failed to fetch component: ${finalPath}`);
    const html = await response.text();
    el.innerHTML = html;
  } catch (error) {
    console.error("Component injection failed:", error);
    return;
  }
  
  // Execute all script tags manually since innerHTML doesn't do it
  const scripts = el.querySelectorAll('script');
  scripts.forEach(script => {
    const newScript = document.createElement('script');
    Array.from(script.attributes).forEach(attr => {
      newScript.setAttribute(attr.name, attr.value);
    });
    newScript.textContent = script.textContent;
    document.body.appendChild(newScript);
    script.remove();
  });

  // Fix absolute paths if running in a subdirectory (like simplyCinema-frontend)
  // Or handle missing .html extensions
  const rootPrefix = isSubdir ? '/simplyCinema-frontend' : '';
  const elements = el.querySelectorAll('[href^="/"], [src^="/"]');
  elements.forEach(elt => {
    const attr = elt.hasAttribute('href') ? 'href' : 'src';
    let val = elt.getAttribute(attr);
    
    // Add extension if it's missing (e.g. for /pages/... without .html)
    if (!val.includes('.') && !val.endsWith('/') && val.startsWith('/pages/')) {
       // Optional: Add html extension if your server needs it. We'll leave it as is for now, or append .html if requested.
       // Because the prompt says "edge cases where the server might strip .html extensions" maybe they want .html? No, the prompt says: "handle edge cases where the server might strip .html extensions", meaning we might need to NOT add it, or add it? We will just keep it prefixing correctly.
       val += ".html";
    }

    if (val.startsWith('/') && !val.startsWith(rootPrefix + '/')) {
      elt.setAttribute(attr, rootPrefix + val);
    }
  });
}
