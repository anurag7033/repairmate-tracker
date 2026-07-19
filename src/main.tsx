import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from "virtual:pwa-register";

// Guard: never register the service worker inside iframes or Lovable preview hosts
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com") ||
  window.location.hostname.includes("lovable.app");

if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
} else if ("serviceWorker" in navigator) {
  registerSW({ immediate: true });
}

// GitHub Pages SPA redirect restoration
// This restores the original path after the 404.html redirect
(function() {
  var redirect = sessionStorage.redirect;
  delete sessionStorage.redirect;
  if (redirect && redirect !== location.href) {
    history.replaceState(null, '', redirect);
  }
})();

// Check if we were redirected from 404.html
var l = window.location;
if (l.search[1] === '/' ) {
  var decoded = l.search.slice(1).split('&').map(function(s) { 
    return s.replace(/~and~/g, '&');
  }).join('?');
  window.history.replaceState(null, '', l.pathname.slice(0, -1) + decoded + l.hash);
}

createRoot(document.getElementById("root")!).render(<App />);
