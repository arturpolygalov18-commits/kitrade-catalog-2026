"""Import approved catalogue photos by permanent product ID and photo index."""
import csv
import hashlib
import io
import json
from pathlib import Path
import re
import sys
import zipfile
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

root = Path(__file__).resolve().parents[2]
archive = Path(sys.argv[1])
report_dir = root / 'reports' / 'image-import'
report_dir.mkdir(parents=True, exist_ok=True)
source = root / 'kitrade-parts-data.js'
text = source.read_text(encoding='utf-8-sig')
start = text.index('[')
items, length = json.JSONDecoder().raw_decode(text[start:])
by_source = {str(item['id']): item for item in items}
registry = json.loads((root / 'catalog-url-map.json').read_text(encoding='utf-8-sig'))
products = {str(p['product_id']): p for p in registry['entities']['products']}
original_dir = report_dir / 'originals'
web_dir = root / 'assets' / 'catalog-products'
original_dir.mkdir(exist_ok=True)
web_dir.mkdir(parents=True, exist_ok=True)

def normalized(url):
    from urllib.parse import parse_qs, urlparse
    slug = parse_qs(urlparse(url).query).get('imageSlug')
    return 'https://80.img.avito.st' + slug[0] if slug else url.replace('http://', 'https://', 1)

with zipfile.ZipFile(archive) as z:
    manifest = z.read('manifest.csv')
    rows = list(csv.DictReader(io.StringIO(manifest.decode('utf-8-sig'))))
    assert len(rows) == len({(r['offer_id'], r['picture_index']) for r in rows})
    for row in rows:
        product = products[row['offer_id']]
        item = by_source[product['source_id']]
        index = int(row['picture_index']) - 1
        destination = '/assets/catalog-products/' + Path(row['new_image_file']).stem + '.webp'
        assert index >= 0 and index < len(item['photos']), row['job_id']
        overrides = json.loads((root / 'feed/offer-overrides.json').read_text(encoding='utf-8-sig'))
        override_urls = json.dumps(overrides)
        assert item['photos'][index] == destination or normalized(item['photos'][index]) == normalized(row['old_image_url']) or row['old_image_url'].split('.xn--p1ai')[-1] in override_urls, row['job_id']
        assert product['canonical_path'] in row['product_url'], row['job_id']
    for row in rows:
        data = z.read(row['new_image_file'])
        assert hashlib.sha256(data).hexdigest() == row['sha256'], row['job_id']
        (original_dir / Path(row['new_image_file']).name).write_bytes(data)
    (report_dir / 'manifest.csv').write_bytes(manifest)

def convert(row):
    name = Path(row['new_image_file']).name
    target = web_dir / (Path(name).stem + '.webp')
    with Image.open(original_dir / name) as image:
        image.convert('RGB').save(target, 'WEBP', quality=88, method=6)
    return target.stat().st_size

with ThreadPoolExecutor(max_workers=4) as pool:
    sizes = list(pool.map(convert, rows))

backup = report_dir / 'kitrade-parts-data.before.js'
if not backup.exists():
    backup.write_text(text, encoding='utf-8')
for row in rows:
    item = by_source[products[row['offer_id']]['source_id']]
    item['photos'][int(row['picture_index']) - 1] = '/assets/catalog-products/' + Path(row['new_image_file']).stem + '.webp'
source.write_text(text[:start] + json.dumps(items, ensure_ascii=False, separators=(',', ':')) + text[start + length:], encoding='utf-8')

# Keep the selected standalone design preview and lightweight catalogue preview current.
preview = root / 'product-preview.html'
html = preview.read_text(encoding='utf-8')
first = next(r for r in rows if r['offer_id'] == '1004' and r['picture_index'] == '1')
photo = 'assets/catalog-products/' + Path(first['new_image_file']).stem + '.webp'
html, count = re.subn(r'(<div class="product-page-gallery"[^>]*>\s*<img[^>]*src=")[^"]+', lambda m: m[1] + photo, html)
preview.write_text(html, encoding='utf-8')
overrides_path = root / 'feed/offer-overrides.json'
overrides = json.loads(overrides_path.read_text(encoding='utf-8-sig'))
for offer_id, override in overrides.items():
    if 'pictures' in override and any(r['offer_id'] == offer_id for r in rows):
        override['pictures'] = by_source[products[offer_id]['source_id']]['photos'][:len(override['pictures'])]
overrides_path.write_text(json.dumps(overrides, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
summary = {'photos': len(rows), 'products': len({r['offer_id'] for r in rows}), 'original_bytes': sum(int(r['bytes']) for r in rows), 'web_bytes': sum(sizes), 'preview_images_updated': count}
(report_dir / 'summary.json').write_text(json.dumps(summary, indent=2), encoding='utf-8')
print(json.dumps(summary))
