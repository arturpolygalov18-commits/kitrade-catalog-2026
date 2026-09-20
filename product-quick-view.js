(() => {
  // One product URL for catalog, search and advertising.
  const items = new Map((window.KITRADE_CATALOG_DATA?.items || []).map(item => [String(item.id), item]));
  const pathFor = item => item?.canonical_path ? (window.KITRADE_SITE_PATH?.(item.canonical_path) || item.canonical_path) : null;
  const openLegacyLink = () => {
    const match = /^#product-(.+)$/.exec(window.location.hash);
    if (!match) return;
    let id;
    try { id = decodeURIComponent(match[1]); } catch { return; }
    const path = pathFor(items.get(id));
    if (path) window.location.replace(path + window.location.search);
  };
  window.addEventListener('hashchange', openLegacyLink);
  openLegacyLink();
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.target.closest('button, input, textarea, select, [data-order-control]')) return;
    const link = event.target.closest('a[data-product-link]');
    const card = event.target.closest('[data-product-card]');
    if (!link && !card) return;
    document.dispatchEvent(new CustomEvent('kitrade:save-catalog'));
    if (link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const path = pathFor(items.get(String(card.dataset.productId)));
    if (path) window.location.assign(path);
  });
})();
