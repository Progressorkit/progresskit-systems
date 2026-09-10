"""Create a public-only tree. Never publish source, SQLite, tests or deployment files."""
from pathlib import Path
import argparse
import shutil
root=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('destination');args=p.parse_args()
dest=Path(args.destination).resolve()
if dest.exists(): raise SystemExit('Destination must not exist; choose a new staging directory.')
dest.mkdir(parents=True)
for file in [root/'index.html', *root.glob('*.jpg'), *root.glob('*.png')]:shutil.copy2(file,dest/file.name)
for folder in ('assets','glikemia-premium','progresskit-mail'):shutil.copytree(root/folder,dest/folder)
print(dest)
