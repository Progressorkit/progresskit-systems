"""Summarize the same local Chrome protocol before/after, without threshold laundering."""
import json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent
after=sys.argv[1] if len(sys.argv)>1 else 'after'
reports={name:json.loads((ROOT/f'{name}-crystal-profile.json').read_text()) for name in ('baseline',after)}
out={'surface':'standalone local hardware Chrome, not embedded application preview','ownerVisualApproval':'OPEN','phases':[],'sourceStable':{},'errors':{},'trace':{}}
for name,x in reports.items():
    out['sourceStable'][name]=x.get('sourceStable')
    out['errors'][name]={'pageErrors':x['errors'],'blockedRequests':x['blocked']}
    out['trace'][name]={r['name']:{'count':r['count'],'totalMs':round(r['totalMs'],3),'maxMs':round(r['maxMs'],3)} for r in x['trials'][0].get('traceSummary',[]) if r['name'] in ('UpdateLayoutTree','Paint','RasterTask','PrePaint','Layout')}
for i in range(4):
    row={'kind':reports['baseline']['trials'][0]['phases'][i]['kind'],'groupIndex':reports['baseline']['trials'][0]['phases'][i]['groupIndex']}
    for name,x in reports.items():
        phases=[t['phases'][i] for t in x['trials']]
        row[name]={'p95Ms':[round(p['p95Ms'],3) for p in phases],'maxMs':[round(p['maxMs'],3) for p in phases],'delaysOver50':[p['delaysOver50'] for p in phases],'styleMs':[round(p['performanceDelta']['RecalcStyleDuration']*1000,3) for p in phases],'taskMs':[round(p['performanceDelta']['TaskDuration']*1000,3) for p in phases]}
        if 'reaction' in phases[0]:
            row[name]['eventToDOMMs']=[round(p['reaction']['eventToDOMMs'],3) if p['reaction']['eventToDOMMs'] is not None else None for p in phases]
            row[name]['handlerToDOMMs']=[round(p['reaction']['handlerToDOMMs'],3) if p['reaction']['handlerToDOMMs'] is not None else None for p in phases]
    out['phases'].append(row)
(ROOT/('crystal-comparison.json' if after=='after' else after+'-comparison.json')).write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps(out,indent=2))
