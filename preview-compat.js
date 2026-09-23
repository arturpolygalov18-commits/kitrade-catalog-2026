(() => {
  const isOpenDesignPreview = window.location.protocol === "about:" || window.location.origin === "null";
  if (!isOpenDesignPreview) return;

  window.KITRADE_PREVIEW_MODE = true;

  // Open Design renders HTML in a sandbox without same-origin storage.
  // Keep preview-only state in memory so page scripts can use sessionStorage
  // without aborting the render when the browser blocks the native getter.
  const previewStorage = (() => {
    const values = new Map();
    return {
      getItem: (key) => values.has(String(key)) ? values.get(String(key)) : null,
      setItem: (key, value) => values.set(String(key), String(value)),
      removeItem: (key) => values.delete(String(key)),
      clear: () => values.clear(),
      key: (index) => [...values.keys()][index] ?? null,
      get length() { return values.size; },
    };
  })();
  try {
    Object.defineProperty(window, "sessionStorage", { value: previewStorage, configurable: true });
  } catch {}

  const splitUrl = (value) => {
    const match = String(value || "/").match(/^([^?#]*)(\?[^#]*)?(#.*)?$/);
    return { path: match?.[1] || "/", search: match?.[2] || "", hash: match?.[3] || "" };
  };

  window.KITRADE_SITE_PATH = (value) => {
    const raw = String(value || "/");
    if (/^(?:[a-z]+:|#)/i.test(raw)) return raw;

    const { path, search, hash } = splitUrl(raw);
    if (!path.startsWith("/")) return raw;
    if (path.startsWith("/assets/")) return `.${path}${search}${hash}`;
    if (path === "/privacy-policy/") return `./privacy-policy.html${search}${hash}`;
    if (path === "/personal-data-consent/") return `./personal-data-consent.html${search}${hash}`;
    if (path === "/catalog/" || path.startsWith("/catalog/")) return `./catalog.html${search}${hash}`;
    return `./index.html${search}${hash}`;
  };

  const rewriteLinks = (root = document) => {
    if (root.matches?.('a[href^="/"]')) {
      root.href = window.KITRADE_SITE_PATH(root.getAttribute("href"));
    }
    root.querySelectorAll?.('a[href^="/"]').forEach((link) => {
      link.href = window.KITRADE_SITE_PATH(link.getAttribute("href"));
    });
  };

  document.addEventListener("DOMContentLoaded", () => rewriteLinks());
  document.addEventListener("submit", (event) => event.preventDefault(), true);

  const observer = new MutationObserver((records) => {
    records.forEach((record) => record.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) rewriteLinks(node);
    }));
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
