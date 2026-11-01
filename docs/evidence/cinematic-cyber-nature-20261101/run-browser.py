"""Keep the owned preview and browser review in one bounded process lifetime."""
import os
from pathlib import Path
import subprocess
import time
import sys
import urllib.request

out = Path(__file__).resolve().parent
env = dict(os.environ, PK_PYTHON='/tmp/progresskit-git-reconcile-20261101-tpbjqwd0/test-venv/bin/python',
           PK_PREVIEW_PORT='8191', PK_PRODUCT_DB='/tmp/progresskit-cinematic-preview-20261101/product.db')
with (out / 'preview.log').open('w') as log:
    preview = subprocess.Popen(['sh', 'scripts/preview.sh'], env=env, stdout=log, stderr=subprocess.STDOUT)
    try:
        for attempt in range(50):
            if preview.poll() is not None:
                raise RuntimeError('Owned preview exited before readiness')
            try:
                with urllib.request.urlopen('http://127.0.0.1:8191/', timeout=1) as response:
                    if response.status == 200:
                        break
            except OSError:
                time.sleep(.1)
        else:
            raise RuntimeError('Owned preview did not become ready')
        for mode in sys.argv[1:]:
            script = 'expanded-actions-review.cjs' if mode == 'actions-final' else 'visual-review.cjs'
            subprocess.run(['node', str(out / script), mode], check=True)
    finally:
        preview.terminate()
        try:
            preview.wait(timeout=10)
        except subprocess.TimeoutExpired:
            preview.kill()
            preview.wait()
