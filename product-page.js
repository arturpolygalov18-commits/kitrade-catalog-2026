(() => {
  document.querySelectorAll('[data-product-photo]').forEach((button) => {
    button.addEventListener('click', () => {
      const gallery = button.closest('.product-page-gallery');
      const image = gallery?.querySelector(':scope > img');
      if (!image) return;
      image.src = button.getAttribute('data-product-photo');
      gallery.querySelectorAll('[data-product-photo]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    });
  });

  const sitePath = (value) => {
    if (typeof window.KITRADE_SITE_PATH === "function") return window.KITRADE_SITE_PATH(value);
    const path = String(value || "/");
    const base = String(window.KITRADE_SITE_CONFIG?.basePath || "").replace(/\/$/, "");
    return base && path.startsWith("/") && !path.startsWith(`${base}/`) ? `${base}${path}` : path;
  };
  const menuToggle = document.querySelector("[data-menu-toggle]");
  const mobileNav = document.querySelector("[data-mobile-nav]");

  const setMenu = (open) => {
    if (!menuToggle || !mobileNav) return;
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    mobileNav.hidden = !open;
    document.body.classList.toggle("menu-open", open);
  };

  menuToggle?.addEventListener("click", () => {
    setMenu(menuToggle.getAttribute("aria-expanded") !== "true");
  });

  mobileNav?.addEventListener("click", (event) => {
    if (event.target.closest("a")) setMenu(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuToggle?.getAttribute("aria-expanded") === "true") {
      setMenu(false);
      menuToggle.focus();
    }
  });

  const dataNode = document.querySelector("#product-page-data");
  if (!dataNode) return;
  let product;
  try { product = JSON.parse(dataNode.textContent); } catch { return; }
  const add = document.querySelector('[data-product-add]');
  let catalogReturn = sitePath('/catalog/');
  let savedView;
  try {
    savedView = JSON.parse(sessionStorage.getItem('kitradeCatalogViewV1') || 'null');
    const ref = document.referrer ? new URL(document.referrer) : null;
    const fromCatalog = ref?.origin === location.origin && ref.pathname.startsWith(sitePath('/catalog/')) && !ref.pathname.includes('/product/');
    const advertising = /[?&](utm_source|yclid|gclid)=/.test(location.search);
    if ((!fromCatalog && !history.state?.kitradeFromCatalog) || advertising) savedView = null;
    const url = new URL(savedView?.path || '', location.origin);
    if (savedView && url.origin === location.origin && url.pathname.startsWith(sitePath('/catalog/')) && !url.pathname.includes('/product/')) {
      catalogReturn = url.pathname;
      history.replaceState({ ...history.state, kitradeFromCatalog: true }, '');
    }
    else savedView = null;
  } catch {}
  const toolbar = document.createElement('div');
  toolbar.className = 'product-page-toolbar';
  toolbar.dataset.odId = 'product-navigation';
  const back = document.createElement('a');
  back.className = 'product-catalog-return';
  back.href = catalogReturn;
  back.textContent = savedView ? '← Вернуться к подбору' : '← Перейти в каталог';
  back.addEventListener('click', () => {
    if (savedView) try { sessionStorage.setItem('kitradeRestoreCatalog', catalogReturn); } catch {}
  });
  const basket = document.createElement('button');
  basket.type = 'button';
  basket.className = 'product-floating-cart';
  basket.setAttribute('data-basket-expand', '');
  basket.setAttribute('aria-haspopup', 'dialog');
  basket.dataset.odId = 'product-floating-basket';
  basket.innerHTML = '<span class="product-cart-glyph" aria-hidden="true"><svg class="product-cart-icon" viewBox="0 0 24 24"><path d="m8 9 4-5 4 5M4 10h16M5 10l1.5 9h11l1.5-9M9.5 13v3M14.5 13v3"/></svg></span><b data-product-basket-count>0</b>';
  toolbar.append(back);
  document.querySelector('.product-page-shell').prepend(toolbar);
  document.body.append(basket);

  const gearSVG = `<svg viewBox="0 0 48 48" fill="none"><g fill="currentColor">${Array.from({length:8},(_,i)=>`<rect x="20" y="3" width="8" height="13" rx="1.2" transform="rotate(${i*45} 24 24)"/>`).join('')}<path fill-rule="evenodd" d="M24 9a15 15 0 1 1 0 30 15 15 0 0 1 0-30Zm0 10a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z"/></g><circle cx="24" cy="24" r="10" stroke="var(--product-bg)" stroke-width="1.4" opacity=".55"/></svg>`;
  const partShapes = [
    gearSVG,
    `<svg viewBox="0 0 48 48" fill="none"><path fill="currentColor" d="M15 5h18v10H15zM19 15h10v26l-5 4-5-4z"/><path stroke="var(--product-bg)" stroke-width="2" d="m19 22 10-4m-10 11 10-4m-10 11 10-4m-10 11 10-4M18 8h12"/></svg>`,
    `<svg viewBox="0 0 48 48"><path fill="currentColor" fill-rule="evenodd" d="m24 4 17 10v20L24 44 7 34V14L24 4Zm0 12a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z"/><path fill="none" stroke="var(--product-bg)" opacity=".45" d="m24 9 13 8v14l-13 8-13-8V17Z"/></svg>`,
    `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor"><circle cx="24" cy="24" r="19" stroke-width="3"/><circle cx="24" cy="24" r="9" stroke-width="3"/>${Array.from({length:8},(_,i)=>`<circle cx="24" cy="10" r="3" fill="currentColor" stroke="none" transform="rotate(${i*45} 24 24)"/>`).join('')}</svg>`
  ];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let nextPart = 0;
  const spillParts = () => {
    if (reduceMotion.matches || typeof Element.prototype.animate !== 'function') return;
    document.querySelectorAll('.product-cart-spill').forEach(part => part.remove());
    const target = basket.querySelector('.product-cart-glyph').getBoundingClientRect();
    [-1,1,-.6,.65,-.2].forEach((direction,index) => {
      const part = document.createElement('span');
      const size = 18 + index % 3 * 4;
      const x = target.left + target.width / 2 - size / 2;
      const y = target.top + 6;
      part.className = 'product-cart-fly-part product-cart-spill';
      part.setAttribute('aria-hidden','true');
      part.innerHTML = partShapes[(nextPart + index) % partShapes.length];
      part.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px;z-index:1101`;
      document.body.append(part);
      const spread = Math.max(-x + 8, Math.min(innerWidth - x - size - 8, direction * (42 + index * 7)));
      const fall = Math.min(88, innerHeight - y - size - 6);
      const frames = Array.from({length:31},(_,frame) => {
        const t = frame / 30;
        return {offset:t,opacity:t < .65 ? Math.min(1,t*12) : (1-t)/.35,transform:`translate3d(${spread*t}px,${fall*t-(180+index*16)*t*(1-t)}px,0) rotate(${direction*220*t}deg) scale(${1-.25*t})`};
      });
      const motion = part.animate(frames,{duration:740+index*35,easing:'linear',fill:'forwards'});
      motion.onfinish = motion.oncancel = () => part.remove();
    });
  };
  const receivePart = () => {
    basket.classList.remove('is-bumping');
    if (reduceMotion.matches) return;
    void basket.offsetWidth;
    basket.classList.add('is-bumping');
    spillParts();
  };
  const animatePartToBasket = source => {
    const sourceRect = source?.getBoundingClientRect();
    const sourceVisible = sourceRect && sourceRect.width && sourceRect.height && sourceRect.bottom > 0 && sourceRect.top < innerHeight;
    if (reduceMotion.matches || !sourceVisible || typeof Element.prototype.animate !== 'function') { receivePart(); return; }
    const flyer = document.createElement('span');
    const target = basket.querySelector('.product-cart-glyph').getBoundingClientRect();
    const startX = sourceRect.left + sourceRect.width / 2 - 23;
    const startY = sourceRect.top + sourceRect.height / 2 - 23;
    const deltaX = target.left + target.width / 2 - 23 - startX;
    const deltaY = target.top + target.height / 2 - 23 - startY;
    const lift = Math.min(140,Math.max(60,Math.abs(deltaX)*.18));
    const distance = Math.hypot(deltaX,deltaY);
    const duration = Math.round(Math.min(1050,Math.max(760,650+distance*.4)));
    const apex = Math.max(-startY+16,-lift*1.6);
    const direction = deltaX < 0 ? -1 : 1;
    flyer.className = 'product-cart-fly-part';
    flyer.setAttribute('aria-hidden','true');
    flyer.innerHTML = partShapes[nextPart++ % partShapes.length];
    flyer.style.left = `${startX}px`;
    flyer.style.top = `${startY}px`;
    document.body.append(flyer);
    const frames = Array.from({length:61},(_,index) => {
      const t = index / 60;
      const u = .45*t + .55*t*t;
      const v = 1-u;
      const x = 3*v*u*u*deltaX + u*u*u*deltaX;
      const y = 3*v*v*u*apex + 3*v*u*u*(deltaY-95) + u*u*u*deltaY;
      const arrival = Math.max(0,(u-.62)/.38);
      const scale = .86 + .14*Math.min(1,t/.12) - .78*arrival*arrival;
      return {offset:t,opacity:Math.min(1,t/.06)*(u < .94 ? 1 : (1-u)/.06),transform:`translate3d(${x}px,${y}px,0) rotate(${direction*(-12+155*u)}deg) scale(${scale})`};
    });
    const flight = flyer.animate(frames,{duration,easing:'linear',fill:'forwards'});
    const finish = () => { flyer.remove(); receivePart(); };
    flight.addEventListener('finish',finish,{once:true});
    flight.addEventListener('cancel',finish,{once:true});
  };
  const quantityControl = document.createElement('div');
  quantityControl.className = 'product-quantity-control';
  quantityControl.dataset.odId = 'product-quantity-control';
  quantityControl.setAttribute('role', 'group');
  quantityControl.setAttribute('aria-label', 'Количество товара');
  quantityControl.hidden = true;
  quantityControl.innerHTML = '<button type="button" data-product-delta="-1" aria-label="Уменьшить количество">−</button><output aria-live="polite">1</output><button type="button" data-product-delta="1" aria-label="Увеличить количество">+</button>';
  add?.after(quantityControl);
  quantityControl.addEventListener('click', event => {
    const button = event.target.closest('[data-product-delta]');
    if (!button) return;
    const delta = Number(button.dataset.productDelta);
    window.KITRADE_CART.changeQuantity(product.id, delta);
    if (delta > 0) animatePartToBasket(button);
    if (!window.KITRADE_CART.get(product.id)) add?.focus({preventScroll:true});
  });
  const sync = () => {
    const selected = window.KITRADE_CART.ids().includes(String(product.id));
    if (add) add.hidden = selected;
    quantityControl.hidden = !selected;
    quantityControl.querySelector('output').textContent = String(window.KITRADE_CART.get(product.id)?.quantity || 0);
    const count = window.KITRADE_CART.items().reduce((sum, item) => sum + item.quantity, 0);
    basket.querySelector('b').textContent = count > 99 ? '99+' : String(count);
    basket.dataset.filled = String(count > 0);
    basket.setAttribute('aria-label', `Открыть корзину, товаров: ${count}`);
  };
  sync();
  window.addEventListener('kitrade:cart-change', sync);
  add?.addEventListener('click', () => {
    if (window.KITRADE_CART.get(product.id)) {
      window.dispatchEvent(new CustomEvent('kitrade:open-basket'));
      return;
    }
    window.KITRADE_CART.add(product);
    window.KITRADE_TRACK?.('add_to_cart', { product_id: product.id, page_type: 'product' });
    sync();
    animatePartToBasket(quantityControl);
    quantityControl.querySelector('[data-product-delta="1"]').focus({preventScroll:true});
  });
})();
