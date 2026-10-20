"""Create a deterministic public-only release archive and SHA-256 manifest."""
import argparse
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import tarfile

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('release_stage',ROOT/'scripts/stage-public.py')
STAGER=importlib.util.module_from_spec(spec);spec.loader.exec_module(STAGER)


def package(destination):
    target=Path(destination).resolve()
    if target.exists():
        raise ValueError('Release destination must not exist.')
    files=STAGER.stage(target/'public')
    records=[]
    for name in files:
        file=target/'public'/name
        records.append({'path':name,'bytes':file.stat().st_size,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()})
    (target/'files.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
    archive=target/'progresskit-v5-public.tar.gz'
    with archive.open('wb') as raw, gzip.GzipFile(filename='',mode='wb',fileobj=raw,mtime=0) as compressed, tarfile.open(fileobj=compressed,mode='w') as tar:
        for name in files:
            file=target/'public'/name
            info=tar.gettarinfo(str(file),arcname=name)
            info.uid=info.gid=0;info.uname=info.gname='';info.mtime=0;info.mode=0o644
            with file.open('rb') as source:
                tar.addfile(info,source)
    checksum=hashlib.sha256(archive.read_bytes()).hexdigest()
    (target/'SHA256SUMS').write_text(checksum+'  '+archive.name+'\n')
    revision=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
    status=subprocess.check_output(['git','status','--porcelain'],cwd=ROOT,text=True)
    brand=json.loads((ROOT/'catalog/brand.json').read_text())
    source={'gitHead':revision,'workingTreeModified':bool(status),'catalogSha256':hashlib.sha256((ROOT/'catalog/projects.json').read_bytes()).hexdigest(),'archiveSha256':checksum,'publicFiles':len(files),'publicBytes':sum(x['bytes'] for x in records),'deployment':'NOT DEPLOYED','ownerVisualApproval':brand['ownerVisualApproval'],'heroSourceStatus':brand['heroSourceStatus']}
    (target/'release.json').write_text(json.dumps(source,indent=2)+'\n')
    print(json.dumps({'directory':str(target),'archive':str(archive),**source},indent=2))


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('destination');args=parser.parse_args()
    try:
        package(args.destination)
    except ValueError as exc:
        raise SystemExit(str(exc))
