"""Inject existing catalogue facts into the isolated, local-only proof."""
import argparse
import html
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]


def generated():
    projects = json.loads((ROOT / 'catalog/projects.json').read_text())['projects']
    p = next(p for p in projects if p['id'] == 'glikemia-premium')
    image = p['gallery'][0]
    values = {key: html.escape(str(p[key])) for key in ('name', 'summary', 'problem', 'stage', 'slug')}
    values.update({f'image_{key}': html.escape(str(image[key])) for key in ('src', 'alt', 'caption', 'width', 'height')})
    values['technologies'] = ''.join('<li>' + html.escape(t) + '</li>' for t in p['technologies'])
    for id, key in [('progresskit-tax', 'tax'), ('progresskit-translator', 'translator')]:
        item = next(p for p in projects if p['id'] == id)
        for field in ('name', 'stage', 'slug'):
            values[key + '_' + field] = html.escape(item[field])
    output = (HERE / 'template.html').read_text()
    for key, value in values.items():
        output = output.replace('@@' + key + '@@', value)
    if '@@' in output:
        raise ValueError('Unresolved proof template value')
    return output


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    output = generated()
    if args.check:
        if not (HERE / 'index.html').exists() or (HERE / 'index.html').read_text() != output:
            raise SystemExit('FAIL: stale proof output')
    else:
        (HERE / 'index.html').write_text(output)
    print('PASS: isolated three-scene proof; original catalogue facts retained')
