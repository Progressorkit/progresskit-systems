"""Static-only browser proof. No API, databases, mail or production access."""
import os,subprocess,tempfile
from pathlib import Path
root=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='pk-mail-static-proof-') as output:
    subprocess.run(['node','scripts/test-mail-pilot.cjs'],cwd=root,
                   env=dict(os.environ,PK_PILOT_RESULTS=output),check=True)
