"""Reuse the homepage request section and validation inside an isolated dialog."""
import base64
import io
import json
import re
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[2]
home = (root / 'index.html').read_text(encoding='utf-8')
section = re.search(r'<section class="reference-request".*?</section>', home, re.S).group()
css = (root / 'artboard-compiled.css').read_text(encoding='utf-8')
css += '\n'.join(re.findall(r'<style[^>]*>(.*?)</style>', home[:home.index('<body')], re.S))
for name in ['07-request-form-headlamp-vin.png', 'kitrade-company-case-transparent.png']:
    with Image.open(root / 'assets' / name) as image:
        image.thumbnail((850, 850))
        data = io.BytesIO()
        image.save(data, 'WEBP', quality=82)
    css = css.replace('./assets/' + name, 'data:image/webp;base64,' + base64.b64encode(data.getvalue()).decode())
script = (root / 'script.js').read_text(encoding='utf-8')
form_script = script[:script.index('const menuToggle')] + '\nconst detailsField=document.querySelector("#details");\nlet catalogDraft=null;\n' + script[script.index('const requestForm ='):script.index('\ndocument.addEventListener("click", (event) => {', script.index('const requestForm ='))]
form_script = form_script.replace('sessionStorage.removeItem("kitradeCatalogDraft");', '')
overrides = '''html {overflow-x:hidden;}
body.reference-only #request {padding-top:24px!important;padding-bottom:24px!important;min-height:0!important;}
[data-reveal] {opacity:1!important;transform:none!important;}
'''
bridge = '''window.KITRADE_SITE_CONFIG=parent.KITRADE_SITE_CONFIG;
window.KITRADE_GET_ATTRIBUTION=()=>parent.KITRADE_GET_ATTRIBUTION?.()||{};
window.KITRADE_TRACK=(...args)=>parent.KITRADE_TRACK?.(...args);

document.addEventListener('keydown',e=>{if(e.key==='Escape')parent.postMessage('kitrade:close-inquiry','*')});
'''
html = '<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + css + '</style><body class="reference-only">' + '<main>' + section + '</main><style>' + overrides + '</style><script>' + (root / 'artboard-scale.js').read_text(encoding='utf-8') + bridge + form_script + '</script></body></html>'
(root / 'catalog-inquiry-content.js').write_text('window.KITRADE_INQUIRY_HTML = ' + json.dumps(html, ensure_ascii=False) + ';\n', encoding='utf-8')
print('Generated homepage inquiry popup:', len(html.encode()), 'bytes')
