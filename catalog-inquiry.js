(() => {
 const home=window.KITRADE_SITE_PATH?.('/#request') || (String(window.KITRADE_SITE_CONFIG?.basePath || "").replace(/\/$/, "") + '/#request');
 const selector='[data-od-id="catalog-pickup-link"],.catalog-mobile-pickup-link';
 document.querySelectorAll(selector).forEach(a=>a.href=home);
 document.addEventListener('click',e=>{const a=e.target.closest(selector);if(!a)return;e.preventDefault();e.stopImmediatePropagation();location.href=home;},true);
})();
