import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const script = fs.readFileSync(new URL('../product-quick-view.js', import.meta.url), 'utf8');
function setup(hash = '') {
  const events = {}; const navigations = []; const saved = [];
  const window = { location: { hash, search: '?utm_source=test', assign: p => navigations.push(p), replace: p => navigations.push(p) },
    KITRADE_CATALOG_DATA: { items: [{id:'A',canonical_path:'/catalog/product/a/'}] }, addEventListener() {} };
  const document = { addEventListener: (type, fn) => events[type] = fn, dispatchEvent: e => saved.push(e.type) };
  vm.runInNewContext(script, {window, document, CustomEvent: class {constructor(type){this.type=type;}}});
  return {events,navigations,saved};
}
test('native product links stay native; card surface opens same canonical route', () => {
  const s=setup(); const card={dataset:{productId:'A'}};
  s.events.click({button:0,target:{closest:q=>q==='a[data-product-link]'?{}:q==='[data-product-card]'?card:null}});
  assert.equal(s.navigations.length,0);
  assert.deepEqual(s.saved,['kitrade:save-catalog']);
  s.events.click({button:0,target:{closest:q=>q==='[data-product-card]'?card:null}});
  assert.deepEqual(s.navigations,['/catalog/product/a/']);
});
test('legacy fragment links resolve to canonical product and retain attribution', () => {
  assert.deepEqual(setup('#product-A').navigations,['/catalog/product/a/?utm_source=test']);
  assert.deepEqual(setup('#product-%broken').navigations,[]);
});
test('quantity controls and modified clicks never trigger card navigation', () => {
  const s=setup();
  s.events.click({button:0,target:{closest:()=>({})}});
  s.events.click({button:0,ctrlKey:true,target:{closest:q=>q==='[data-product-card]'?{dataset:{productId:'A'}}:null}});
  assert.equal(s.navigations.length,0);
});
