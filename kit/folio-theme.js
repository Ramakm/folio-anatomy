/* Folio theme: light by default. Dark only when the reader chooses it; the choice is remembered
   and shared with every Folio page and embedded plate on the same site. */
(function () {
  "use strict";
  var KEY = "folio-theme", doc = document.documentElement;
  function get() { try { return localStorage.getItem(KEY) === "dark" ? "dark" : "light"; } catch (e) { return "light"; } }
  function label() {
    var t = doc.dataset.theme === "dark" ? "dark" : "light";
    document.querySelectorAll("[data-theme-toggle]").forEach(function (b) {
      b.setAttribute("aria-pressed", t === "dark");
      b.textContent = t === "dark" ? "Light" : "Dark";
      b.title = t === "dark" ? "Switch to the light theme" : "Switch to the dark theme";
    });
  }
  function apply(t) {
    doc.dataset.theme = t;
    doc.style.colorScheme = t;
    label();
    document.querySelectorAll("iframe").forEach(function (f) { try { f.contentWindow.postMessage({ folioTheme: t }, "*"); } catch (e) {} });
  }
  apply(get());
  addEventListener("storage", function (e) { if (e.key === KEY) apply(get()); });
  addEventListener("message", function (e) { var d = e.data; if (d && (d.folioTheme === "dark" || d.folioTheme === "light")) apply(d.folioTheme); });
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-theme-toggle]");
    if (!b) return;
    var t = doc.dataset.theme === "dark" ? "light" : "dark";
    try { localStorage.setItem(KEY, t); } catch (err) {}
    apply(t);
  });
  document.addEventListener("DOMContentLoaded", label);
  // a plate embedded in this page learns the theme as soon as it loads
  document.addEventListener("load", function (e) {
    if (e.target && e.target.tagName === "IFRAME") try { e.target.contentWindow.postMessage({ folioTheme: doc.dataset.theme }, "*"); } catch (err) {}
  }, true);
})();
