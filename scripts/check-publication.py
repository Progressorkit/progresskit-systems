"""Publication gate required by the owner's V5 correction; review builds remain allowed."""
import json
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[1]


def publication_errors(brand):
    errors=[]
    if brand.get('ownerVisualApproval')!='APPROVED':
        errors.append('Owner visual approval is OPEN.')
    if not brand.get('heroBackground') or brand.get('heroSourceStatus')!='REVIEWED_EDIT':
        errors.append('The approved-source landscape edit is not ready.')
    return errors


if __name__=='__main__':
    errors=publication_errors(json.loads((ROOT/'catalog/brand.json').read_text()))
    if errors:
        print('PUBLICATION BLOCKED: '+' '.join(errors),file=sys.stderr)
        raise SystemExit(1)
    print('PASS: explicit owner visual approval and reviewed hero source recorded.')
