/**
 * Wraps html2canvas so snapshots work with Tailwind v4 / modern CSS that uses
 * oklch(), oklab(), and color-mix(in oklab|oklch, …) — which html2canvas 1.4.x
 * cannot parse. Restores original CSS after each capture.
 *
 * Load after html2canvas.min.js and before liquidGL.js.
 */
(function () {
  "use strict";

  function patchModernColors() {
    const patches = [];
    const styleTextSnapshots = [];
    const inlineSnapshots = [];
    const cache = new Map();

    const patterns = [
      /oklch\([^)]+\)/g,
      /oklab\([^)]+\)/g,
      /color-mix\(\s*in\s+(?:oklab|oklch)[^)]*\)/gi,
    ];

    function resolveColor(raw) {
      if (cache.has(raw)) return cache.get(raw);
      const d = document.createElement("div");
      d.style.cssText = "position:absolute;left:-9999px;color:transparent;";
      try {
        d.style.color = raw;
      } catch (_) {
        cache.set(raw, raw);
        return raw;
      }
      document.body.appendChild(d);
      const rgb = getComputedStyle(d).color;
      d.remove();
      const out = rgb && rgb !== "transparent" ? rgb : raw;
      cache.set(raw, out);
      return out;
    }

    function replaceAll(str) {
      let s = str;
      for (const re of patterns) {
        s = s.replace(re, (m) => resolveColor(m));
      }
      return s;
    }

    function walkRules(rules) {
      if (!rules) return;
      for (const rule of rules) {
        try {
          if (rule.cssRules) walkRules(rule.cssRules);
        } catch (_) {}
        if (rule.style && rule.style.length !== undefined) {
          for (let i = 0; i < rule.style.length; i++) {
            const prop = rule.style[i];
            const val = rule.style.getPropertyValue(prop);
            if (
              val &&
              (val.includes("oklch") ||
                val.includes("oklab") ||
                val.includes("color-mix"))
            ) {
              const priority = rule.style.getPropertyPriority(prop);
              const newVal = replaceAll(val);
              patches.push({
                style: rule.style,
                prop,
                original: val,
                priority,
              });
              rule.style.setProperty(prop, newVal, priority);
            }
          }
        }
      }
    }

    for (const el of document.querySelectorAll("[style]")) {
      const attr = el.getAttribute("style");
      if (
        attr &&
        (attr.includes("oklch") ||
          attr.includes("oklab") ||
          attr.includes("color-mix"))
      ) {
        inlineSnapshots.push({ el, attr });
        el.setAttribute("style", replaceAll(attr));
      }
    }

    for (const node of document.querySelectorAll("style")) {
      const txt = node.textContent;
      if (
        txt &&
        (txt.includes("oklch") ||
          txt.includes("oklab") ||
          txt.includes("color-mix"))
      ) {
        styleTextSnapshots.push({ node, orig: txt });
        node.textContent = replaceAll(txt);
      }
    }

    for (const sheet of document.styleSheets) {
      try {
        walkRules(sheet.cssRules);
      } catch (_) {}
    }

    if (document.adoptedStyleSheets && document.adoptedStyleSheets.length) {
      for (const sheet of document.adoptedStyleSheets) {
        try {
          walkRules(sheet.cssRules);
        } catch (_) {}
      }
    }

    return function restore() {
      for (const { el, attr } of inlineSnapshots) {
        el.setAttribute("style", attr);
      }
      for (const { node, orig } of styleTextSnapshots) {
        node.textContent = orig;
      }
      for (let i = patches.length - 1; i >= 0; i--) {
        const p = patches[i];
        p.style.setProperty(p.prop, p.original, p.priority);
      }
    };
  }

    function wrapHtml2Canvas() {
    if (typeof html2canvas === "undefined" || html2canvas.__liquidGLPatched) {
      return;
    }
    const original = html2canvas;
    const wrapped = function (element, options) {
      const restore = patchModernColors();
      try {
        const p = original(element, options);
        return Promise.resolve(p).finally(restore);
      } catch (e) {
        restore();
        throw e;
      }
    };
    wrapped.__liquidGLPatched = true;
    wrapped.prototype = original.prototype;
    window.html2canvas = wrapped;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wrapHtml2Canvas);
  } else {
    wrapHtml2Canvas();
  }
})();
