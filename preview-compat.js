(() => {
  const isOpenDesignPreview = window.location.protocol === "about:" || window.location.origin === "null";
  if (!isOpenDesignPreview) return;

  window.KITRADE_PREVIEW_MODE = true;

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
