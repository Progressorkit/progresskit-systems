"""Stage only reviewed public files; never copy the repository or entire assets tree."""
from pathlib import Path
import argparse
import importlib.util
import json
import shutil

ROOT = Path(__file__).resolve().parents[1]


def public_files():
    data=json.loads((ROOT/'catalog/projects.json').read_text())
    files={
        'index.html','404.html','robots.txt','sitemap.xml','og-progresskit.jpg',
        'assets/site-v4.css','assets/site-v5.css','assets/site-v5.js','assets/hero.css',
        'assets/hero-monument.css','assets/home-atmosphere.css','assets/hero-space.js',
        'assets/engineering-exhibit.css','assets/engineering-exhibit.js',
        'assets/brand-atmosphere.css',
        'assets/project-slices.css','assets/delivery.css','assets/project-mechanism.css','assets/visual-acceptance.css',
        'assets/project-showroom.css','assets/project-showroom.js','assets/project-hologram.css','assets/project-hologram.js',
        'assets/brand/stone-material.svg','assets/brand/monument-serif-bold.ttf','assets/brand/motto-serif-italic.ttf','assets/brand/monument-font-license.txt',
        'assets/progresskit-product-shell.css',
        'assets/brand/progressorkit-primary.png','assets/brand/progressorkit-stamp.png',
        'glikemia-premium/index.html','glikemia-premium/product.css','glikemia-premium/product.js',
        'assets/projects/glikemia/product-measurement.webp','assets/projects/glikemia/product-language.webp',
        'assets/projects/glikemia/product-qr.png','progresskit-mail/index.html','prywatnosc/index.html','projekty/index.html',
    }
    for p in data['projects']:
        files.add(f'projekty/{p["slug"]}/index.html')
        files.update(image['src'] for image in p['gallery'])
    brand=json.loads((ROOT/'catalog/brand.json').read_text())
    if brand['heroBackground']:
        files.add(brand['heroBackground'])
    return sorted(files)


def stage(destination):
    spec=importlib.util.spec_from_file_location('build_site',ROOT/'scripts/build-site.py')
    builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)
    data=builder.read_catalog()
    for name,content in builder.generated(data).items():
        if not (ROOT/name).is_file() or (ROOT/name).read_text()!=content:
            raise ValueError('Stale generated output: '+name+'; run python3 scripts/build-site.py first.')
    dest=Path(destination).resolve()
    if dest.exists():
        raise ValueError('Destination must not exist; choose a new staging directory.')
    files=public_files()
    for name in files:
        source=ROOT/name
        if not source.is_file() or source.is_symlink() or not source.resolve().is_relative_to(ROOT):
            raise ValueError('Missing or unsafe public file: '+name)
    dest.mkdir(parents=True)
    for name in files:
        target=dest/name;target.parent.mkdir(exist_ok=True,parents=True)
        shutil.copy2(ROOT/name,target)
    return files


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('destination');args=parser.parse_args()
    try:
        files=stage(args.destination)
    except ValueError as exc:
        raise SystemExit(str(exc))
    print(f'PASS: {len(files)} public files staged in {Path(args.destination).resolve()}')
