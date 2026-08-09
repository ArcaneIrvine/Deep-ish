const STORAGE_KEY = "deepish-theme";

// "reading-room" (the original look) has no data-theme attribute — it's
// the :root default in index.css — but is listed here so it shows up as a
// normal option in the picker rather than a hidden default.
export const THEMES = [
  { id: "reading-room", label: "Reading Room", swatch: "#d8a24a" },
  { id: "midnight-study", label: "Midnight Study", swatch: "#aab8e8" },
  { id: "dark-academia", label: "Dark Academia", swatch: "#c1854f" },
  { id: "archive", label: "Archive", swatch: "#a8556b" },
];

export function getTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY) || "reading-room";
  } catch {
    return "reading-room";
  }
}

export function setTheme(id) {
  if (id === "reading-room") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", id);
  }
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Private browsing / storage disabled — theme just won't persist across
    // reloads, not worth surfacing an error for.
  }
}