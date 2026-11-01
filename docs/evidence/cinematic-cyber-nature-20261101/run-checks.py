"""Run existing checks with individual test totals and durable task-local logs."""
import json
from pathlib import Path
import re
import subprocess
import sys
import unittest

out = Path(__file__).parent / 'tests'
out.mkdir(exist_ok=True)
rows = []
for file in sorted(Path('tests').glob('*.test.cjs')):
    run = subprocess.run(['node', str(file)], text=True, capture_output=True)
    (out / (file.stem + '.log')).write_text(run.stdout + run.stderr)
    row = {'file': str(file), 'exitCode': run.returncode}
    for key in ['tests', 'pass', 'fail', 'skipped', 'cancelled']:
        match = re.search(r'^# ' + key + r' (\d+)$', run.stdout, re.M)
        row[key] = int(match[1]) if match else None
    rows.append(row)
summary = {'files': rows, 'PASS': sum(r['pass'] or 0 for r in rows),
           'FAIL': sum(r['fail'] or 0 for r in rows),
           'SKIP': sum(r['skipped'] or 0 for r in rows)}
(out / 'node-summary.json').write_text(json.dumps(summary, indent=2) + '\n')
print('Node:', {k: v for k, v in summary.items() if k != 'files'}, flush=True)
with (out / 'python.log').open('w') as log:
    result = unittest.TextTestRunner(stream=log, verbosity=2).run(unittest.defaultTestLoader.discover('tests'))
summary = {'run': result.testsRun,
           'PASS': result.testsRun-len(result.failures)-len(result.errors)-len(result.skipped),
           'FAIL': len(result.failures), 'ERROR': len(result.errors), 'SKIP': len(result.skipped),
           'successful': result.wasSuccessful()}
(out / 'python-summary.json').write_text(json.dumps(summary, indent=2) + '\n')
print('Python:', summary, flush=True)
sys.exit(0 if result.wasSuccessful() and all(r['exitCode'] == 0 and r['pass'] is not None for r in rows) else 1)
