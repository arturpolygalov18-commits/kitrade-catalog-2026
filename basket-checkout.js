(() => {
 const sitePath = p => window.KITRADE_SITE_PATH?.(p) || p;
 document.querySelector('#product-inquiry')?.remove();
 const host=document.createElement('div');host.innerHTML="<dialog class=\"product-inquiry\" id=\"product-inquiry\" aria-labelledby=\"product-inquiry-title\" data-od-id=\"product-inquiry\">\n    <button class=\"product-inquiry-close\" type=\"button\" aria-label=\"Закрыть заявку\" data-inquiry-close>×</button>\n    <div class=\"product-inquiry-layout\">\n      <aside class=\"product-inquiry-visual\" data-od-id=\"product-inquiry-callout\">\n        <img src=\"/assets/08-contacts-phone-tag.png\" alt=\"\" width=\"1448\" height=\"1086\">\n        <div class=\"product-inquiry-visual-copy\">\n          <span>KITRADE</span>\n          <strong>Удобнее обсудить по телефону?</strong>\n          <p>Позвоните — менеджер уточнит детали, проверит корзину и подготовит расчёт стоимости и доставки.</p>\n          <a href=\"tel:+79952453000\" aria-label=\"Позвонить по номеру 8 (995) 245-30-00\">8 (995) 245-30-00</a>\n        </div>\n      </aside>\n      <div class=\"product-inquiry-content\">\n        <p class=\"product-page-category\">Расчёт заказа</p>\n        <h2 id=\"product-inquiry-title\">Куда отправить расчёт?</h2>\n        <p>Менеджер свяжется с вами по выбранному каналу.</p>\n        <form data-product-form>\n          <label>Ваше имя<input name=\"name\" autocomplete=\"name\" maxlength=\"100\" required></label>\n          <label>Телефон<input name=\"contact\" type=\"tel\" autocomplete=\"tel\" maxlength=\"25\" required placeholder=\"+7 (___) ___-__-__\"></label>\n          <fieldset class=\"product-inquiry-messengers\">\n            <legend>Удобный способ связи</legend>\n            <label><input type=\"radio\" name=\"messenger\" value=\"Max\" checked><span>Max</span></label>\n            <label><input type=\"radio\" name=\"messenger\" value=\"Telegram\"><span>Telegram</span></label>\n            <label><input type=\"radio\" name=\"messenger\" value=\"Звонок\"><span>Звонок</span></label>\n          </fieldset>\n          <label class=\"product-inquiry-consent\"><input name=\"consent\" type=\"checkbox\" required><span>Я согласен на обработку персональных данных на условиях <a href=\"/personal-data-consent/\" target=\"_blank\" rel=\"noopener\">согласия</a>.</span></label>\n          <p data-inquiry-status role=\"status\" aria-live=\"polite\"></p>\n          <button class=\"product-page-request\" type=\"submit\">Отправить на расчёт</button>\n        </form>\n      </div>\n    </div>\n  </dialog>";
 const dialog=host.firstElementChild;
 dialog.querySelectorAll("[src],[href]").forEach(el=>{for(const a of ["src","href"]){const v=el.getAttribute(a);if(v?.startsWith("/"))el.setAttribute(a,sitePath(v));}});
 document.documentElement.append(dialog);
 const form=dialog.querySelector('form'),status=dialog.querySelector('[data-inquiry-status]');
 let opener;
 window.addEventListener('kitrade:checkout',()=>{
   if(!window.KITRADE_CART?.items().length)return;
   opener=document.activeElement;
   if(!submitting){form.querySelectorAll('input').forEach(e=>e.disabled=false);const b=form.querySelector('[type=submit]');b.hidden=false;b.disabled=false;status.textContent='';}
   dialog.showModal();
 });
 dialog.querySelector('[data-inquiry-close]').onclick=()=>dialog.close();
 dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
 dialog.addEventListener('close',()=>opener?.focus({preventScroll:true}));
  let submitting = false;
  form?.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting || !form.reportValidity()) return;
    const contact = form.elements.contact.value.trim();
    if (!/^\d{10,15}$/.test(contact.replace(/\D/g, ''))) {
      status.textContent = 'Укажите корректный номер телефона.';
      form.elements.contact.focus();
      return;
    }
    const name = form.elements.name.value.trim();
    if (!name) { form.elements.name.focus(); return; }
    const products = window.KITRADE_CART.items().map(item => ({
      product_id: item.id, title: item.title, article: item.article || '', price: Number(String(item.price || '').replace(/[^\d.,]/g, '').replace(',', '.')) || 0,
      quantity: item.quantity, url: new URL(sitePath(item.canonical_path || item.canonicalPath || '/catalog/'), location.origin).href
    }));
    if (!products.length) { status.textContent = 'Добавьте детали в корзину.'; return; }
    const orderId = `product-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const payload = {
      external_id: orderId, website: '', client: { name, contact, messenger: form.elements.messenger.value },
      vehicle: { model: '', year: '', vin: '' },
      details: products.map(item => `${item.title}: ${item.quantity} шт.`).join('\n') + '\nЗапрос стоимости с доставкой.', photos: [],
      order: { order_id: orderId, attribution: window.KITRADE_GET_ATTRIBUTION?.() || {
        metrika_client_id: '', yclid: '', utm: {}, first_landing_url: location.href },
        selected_products: products, preliminary_sum: products.reduce((sum, item) => sum + item.price * item.quantity, 0), currency: 'RUB' }
    };
    const submit = form.querySelector('[type="submit"]');
    submitting = true;
    submit.disabled = true;
    form.setAttribute('aria-busy', 'true');
    status.textContent = 'Отправляем заявку…';
    window.KITRADE_TRACK?.('request_submit_attempt', { source: 'basket', order_id: orderId, product_count: products.length });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    try {
      const response = await fetch(window.KITRADE_SITE_CONFIG?.crmIntakeUrl || 'https://195.19.20.105/api/website-intake', {
        method: 'POST', mode: 'cors', credentials: 'omit',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), signal: controller.signal
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok || result.confirmation !== 'saved') throw new Error('Not confirmed');
      window.KITRADE_CART.consume(products);
      status.textContent = 'Заявка отправлена. Менеджер свяжется с вами, чтобы уточнить совместимость и доставку.';
      submit.hidden = true;
      form.querySelectorAll('input').forEach(input => { input.disabled = true; });
      window.KITRADE_TRACK?.('request_submit_success', { source: 'basket', order_id: orderId, product_count: products.length });
    } catch {
      status.textContent = 'Не удалось отправить заявку. Попробуйте ещё раз или позвоните нам.';
      submit.disabled = false;
      window.KITRADE_TRACK?.('request_submit_error', { source: 'basket' });
    } finally {
      clearTimeout(timeout);
      submitting = false;
      form.removeAttribute('aria-busy');
    }
  });

})();
