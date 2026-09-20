"use strict";

(() => {
  const requestPanel = document.querySelector(".request-panel");
  const requestSelection = document.querySelector("#requestSelection");
  const filterPanel = document.querySelector(".filter-panel");
  if (!requestPanel || !requestSelection) return;
  const syncViewport = () => {
    const viewport = window.visualViewport;
    const height = viewport?.height || window.innerHeight;
    document.documentElement.style.setProperty('--catalog-visible-height', `${height}px`);
    document.documentElement.style.setProperty('--catalog-visible-top', `${viewport?.offsetTop || 0}px`);
  };
  syncViewport();
  window.addEventListener('resize', syncViewport, { passive: true });
  window.visualViewport?.addEventListener('resize', syncViewport, { passive: true });
  window.visualViewport?.addEventListener('scroll', syncViewport, { passive: true });

  const closeButton = document.createElement("button");
  closeButton.className = "catalog-request-close";
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Закрыть заявку");
  closeButton.textContent = "";
  requestPanel.prepend(closeButton);

  // Eight machined teeth, a hub and an open bore; shared by both motion states.
  const gearSVG = `<svg viewBox="0 0 48 48" fill="none"><g fill="currentColor">${Array.from({length: 8}, (_, i) => `<rect x="20" y="3" width="8" height="13" rx="1.2" transform="rotate(${i * 45} 24 24)"/>`).join('')}<path fill-rule="evenodd" d="M24 9a15 15 0 1 1 0 30 15 15 0 0 1 0-30Zm0 10a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z"/></g><circle cx="24" cy="24" r="10" stroke="var(--catalog-bg)" stroke-width="1.4" opacity=".55"/></svg>`;
  const partShapes = [
    gearSVG,
    `<svg viewBox="0 0 48 48" fill="none"><path fill="currentColor" d="M15 5h18v10H15zM19 15h10v26l-5 4-5-4z"/><path stroke="var(--catalog-bg)" stroke-width="2" d="m19 22 10-4m-10 11 10-4m-10 11 10-4m-10 11 10-4M18 8h12"/></svg>`,
    `<svg viewBox="0 0 48 48"><path fill="currentColor" fill-rule="evenodd" d="m24 4 17 10v20L24 44 7 34V14L24 4Zm0 12a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z"/><path fill="none" stroke="var(--catalog-bg)" opacity=".45" d="m24 9 13 8v14l-13 8-13-8V17Z"/></svg>`,
    `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor"><circle cx="24" cy="24" r="19" stroke-width="3"/><circle cx="24" cy="24" r="9" stroke-width="3"/>${Array.from({length:8},(_,i)=>`<circle cx="24" cy="10" r="3" fill="currentColor" stroke="none" transform="rotate(${i*45} 24 24)"/>`).join('')}</svg>`
  ];
  let nextPart = 0;
  const dock = document.createElement("button");
  dock.className = "catalog-mobile-cart";
  dock.type = "button";
  dock.setAttribute("aria-haspopup", "dialog");
  dock.dataset.odId = 'mobile-basket';
  dock.innerHTML = `<span class="catalog-cart-glyph" aria-hidden="true"><span class="catalog-cart-part">${gearSVG}</span><svg class="catalog-cart-icon" viewBox="0 0 24 24">
    <path d="m8 9 4-5 4 5M4 10h16M5 10l1.5 9h11l1.5-9M9.5 13v3M14.5 13v3" />
  </svg></span><span class="catalog-cart-copy"><strong>Корзина</strong><span data-mobile-cart-label>Пока пусто</span></span><b data-mobile-cart-count>0</b>`;
  document.body.append(dock);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let activeFlights = 0;
  const spillParts = () => {
    if (reduceMotion.matches || typeof Element.prototype.animate !== 'function') return;
    // A small, bounded spill: parts rise over the rim, then fall to either side.
    document.querySelectorAll('.catalog-cart-spill').forEach(part => part.remove());
    const rect = dock.getBoundingClientRect();
    const glyph = dock.querySelector('.catalog-cart-glyph').getBoundingClientRect();

    [-1, 1, -.6, .65, -.2].forEach((direction, i) => {
      const part = document.createElement('span');
      part.className = 'catalog-cart-fly-part catalog-cart-spill';
      part.setAttribute('aria-hidden', 'true');
      part.innerHTML = partShapes[(nextPart + i) % partShapes.length];
      const size = 18 + (i % 3) * 4;
      const x = glyph.left + glyph.width / 2 - size / 2;
      const y = rect.top + 6;
      part.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px;z-index:1101`;
      document.body.append(part);
      const spread = Math.max(-x + 8, Math.min(innerWidth - x - size - 8, direction * (42 + i * 7)));
      const fall = Math.min(88, innerHeight - y - size - 6);
      const frames = Array.from({length: 31}, (_, n) => {
        const t = n / 30;
        return {offset:t, opacity:t < .65 ? Math.min(1, t * 12) : (1-t)/.35,
          transform:`translate3d(${spread*t}px, ${fall*t - (180+i*16)*t*(1-t)}px, 0) rotate(${direction*220*t}deg) scale(${1-.25*t})`};
      });
      const motion = part.animate(frames, {duration:740 + i*35, easing:'linear', fill:'forwards'});
      motion.onfinish = motion.oncancel = () => part.remove();
    });
  };
  const receivePart = () => {
    dock.classList.remove("is-bumping");
    if (reduceMotion.matches) return;
    void dock.offsetWidth;
    dock.classList.add("is-bumping");
    spillParts();
  };
  const animatePartToDock = () => {
    const source = document.activeElement?.closest?.('[data-add], [data-order-control] button, [data-basket-delta]');
    const sourceRect = source?.getBoundingClientRect();
    const dockRect = dock.getBoundingClientRect();
    const sourceVisible = sourceRect && sourceRect.width && sourceRect.height && sourceRect.bottom > 0 && sourceRect.top < innerHeight;
    if (reduceMotion.matches || !sourceVisible || typeof Element.prototype.animate !== 'function') {
      receivePart();
      return;
    }

    const flyer = document.createElement('span');
    flyer.className = 'catalog-cart-fly-part';
    flyer.setAttribute('aria-hidden', 'true');
    flyer.innerHTML = partShapes[nextPart++ % partShapes.length];
    const glyphRect = dock.querySelector('.catalog-cart-glyph').getBoundingClientRect();
    const startX = sourceRect.left + sourceRect.width / 2 - 23;
    const startY = sourceRect.top + sourceRect.height / 2 - 23;
    const deltaX = glyphRect.left + glyphRect.width / 2 - 23 - startX;
    const deltaY = glyphRect.top + glyphRect.height / 2 - 23 - startY;
    const lift = Math.min(140, Math.max(60, Math.abs(deltaX) * .18));
    flyer.style.left = `${startX}px`;
    flyer.style.top = `${startY}px`;
    document.body.append(flyer);
    activeFlights += 1;
    document.body.classList.add('catalog-cart-flight-active');

    // Ease into a ballistic arc, with continuous velocity and a near-vertical arrival.
    const distance = Math.hypot(deltaX, deltaY);
    const duration = Math.round(Math.min(1050, Math.max(760, 650 + distance * .4)));
    const apex = Math.max(-startY + 16, -lift * 1.6);
    const direction = deltaX < 0 ? -1 : 1;
    const frames = Array.from({ length: 61 }, (_, i) => {
      const t = i / 60;
      const u = .45 * t + .55 * t * t;
      const v = 1 - u;
      const x = 3*v*u*u*deltaX + u*u*u*deltaX;
      const y = 3*v*v*u*apex + 3*v*u*u*(deltaY - 95) + u*u*u*deltaY;
      const arrival = Math.max(0, (u - .62) / .38);
      const scale = .86 + .14 * Math.min(1,t/.12) - .78*arrival*arrival;
      return { offset: t, opacity: Math.min(1,t/.06) * (u < .94 ? 1 : (1-u)/.06),
        transform: `translate3d(${x}px, ${y}px, 0) rotate(${direction*(-12+155*u)}deg) scale(${scale})` };
    });
    const flight = flyer.animate(frames, { duration, easing: 'linear', fill: 'forwards' });

    let finished = false;
    const finishFlight = () => {
      if (finished) return;
      finished = true;
      flyer.remove();
      activeFlights = Math.max(0, activeFlights - 1);
      document.body.classList.toggle('catalog-cart-flight-active', activeFlights > 0);
      receivePart();
      if (!activeFlights) window.dispatchEvent(new Event("kitrade:cart-landed"));
    };
    flight.addEventListener('finish', finishFlight, { once: true });
    flight.addEventListener('cancel', finishFlight, { once: true });
  };

  let activePanel = null;
  const blocked = new Map();
  function modal(panel, open) {
    blocked.forEach((value, element) => { element.inert = value; });
    blocked.clear();
    activePanel = open ? panel : null;
    if (open) panel.setAttribute('aria-modal', 'true');
    else panel.removeAttribute('aria-modal');
    if (open) {
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-label', panel === filterPanel ? 'Фильтры каталога' : 'Оформление заявки');
      for (let branch = panel; branch.parentElement && branch !== document.body; branch = branch.parentElement) {
        [...branch.parentElement.children].filter(element => element !== branch).forEach(element => {
          blocked.set(element, element.inert); element.inert = true;
        });
      }
    } else panel.removeAttribute('role');
  }
  document.addEventListener('keydown', event => {
    if (event.key !== 'Tab' || !activePanel) return;
    const controls = [...activePanel.querySelectorAll('button, input, textarea, select, a[href], [tabindex="0"]')]
      .filter(element => !element.disabled && element.getClientRects().length);
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });

  if (filterPanel) {
    const filterClose = document.createElement("button");
    filterClose.className = "catalog-filter-close";
    filterClose.type = "button";
    filterClose.setAttribute("aria-label", "Закрыть фильтры");
    filterClose.textContent = "";
    filterPanel.prepend(filterClose);

    const filterButton = document.createElement("button");
    filterButton.className = "catalog-mobile-filter-button";
    filterButton.type = "button";
    filterButton.setAttribute("aria-controls", "catalog");
    filterButton.textContent = "Фильтры";
    document.body.append(filterButton);

    const closeFilters = () => {
      modal(filterPanel, false);
      filterPanel.classList.remove("is-mobile-open");
      document.body.classList.remove("catalog-filter-open");
      filterButton.setAttribute("aria-expanded", "false");
      filterButton.focus({ preventScroll: true });
    };

    const openFilters = () => {
      modal(filterPanel, true);
      filterPanel.classList.add("is-mobile-open");
      document.body.classList.add("catalog-filter-open");
      filterButton.setAttribute("aria-expanded", "true");
      filterPanel.scrollTop = 0;
      filterClose.focus({ preventScroll: true });
    };

    filterButton.addEventListener("click", openFilters);
    document.querySelector('.filter-apply')?.addEventListener('click', () => {
      if (filterPanel.classList.contains('is-mobile-open')) closeFilters();
    });
    filterClose.addEventListener("pointerdown", (event) => event.stopPropagation());
    filterClose.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeFilters();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && filterPanel.classList.contains("is-mobile-open")) closeFilters();
    });
  }

  const openPanel = () => {
    modal(requestPanel, true);
    requestPanel.classList.add("is-mobile-open");
    document.body.classList.add("catalog-request-open");
    requestPanel.scrollTop = 0;
    closeButton.focus({ preventScroll: true });
  };

  const closePanel = () => {
    modal(requestPanel, false);
    requestPanel.classList.remove("is-mobile-open");
    document.body.classList.remove("catalog-request-open");
    dock.focus({ preventScroll: true });
  };

  let previousCount = null;
  const updateDock = () => {
    const entries = window.KITRADE_CART?.items() || [];
    const count = entries.reduce((sum, entry) => sum + entry.quantity, 0);
    dock.dataset.filled = String(count > 0);
    dock.querySelector("[data-mobile-cart-count]").textContent = count > 99 ? '99+' : String(count);
    dock.querySelector("[data-mobile-cart-label]").textContent =
      count === 0 ? "Пока пусто" : `Выбрано: ${count} шт.`;
    dock.setAttribute("aria-label", count === 0 ? "Корзина, пока пусто" : `Корзина, товаров: ${count}`);
    if (previousCount !== null && count > previousCount) {
      animatePartToDock();
    }
    previousCount = count;
  };

  dock.addEventListener("click", () => window.dispatchEvent(new CustomEvent('kitrade:open-basket')));
  dock.addEventListener("animationend", () => dock.classList.remove("is-bumping"));
  window.addEventListener('kitrade:cart-change', updateDock);
  matchMedia('(max-width: 1199px)').addEventListener('change', event => {
    if (!event.matches && activePanel) {
      activePanel.classList.remove('is-mobile-open');
      modal(activePanel, false);
      document.body.classList.remove('catalog-filter-open', 'catalog-request-open');
    }
  });
  closeButton.addEventListener("click", closePanel);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && requestPanel.classList.contains("is-mobile-open")) closePanel();
  });

  new MutationObserver(updateDock).observe(requestSelection, { childList: true, subtree: true });
  updateDock();
  const openRequest = (event) => {
    if (location.hash !== '#request' && event?.type !== 'kitrade:open-request') return;
    openPanel();
  };
  window.addEventListener('hashchange', openRequest);
  window.addEventListener('kitrade:open-request', openRequest);
  document.addEventListener('click', event => { if (event.target.closest('[data-cart-link]') && location.hash === '#request') openRequest(); });
  openRequest();
})();
