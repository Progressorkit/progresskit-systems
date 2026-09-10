"""Server-only moderation: python owner.py count|pending|approve ID|delete ID."""
import argparse
import json
from contextlib import closing
from product import connect
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('action', choices=['count', 'pending', 'approve', 'delete'])
parser.add_argument('id', type=int, nargs='?')
args = parser.parse_args()
with closing(connect()) as db:
    if args.action == 'count':
        print(json.dumps(dict(db.execute('SELECT total,last_at FROM downloads WHERE id=1').fetchone())))
    elif args.action == 'pending':
        for row in db.execute("SELECT * FROM reviews WHERE status='pending' ORDER BY id LIMIT 100"):
            print(json.dumps(dict(row), ensure_ascii=True))
    else:
        if args.id is None: parser.error('Podaj ID opinii.')
        if args.action == 'approve':
            cursor = db.execute("UPDATE reviews SET status='approved' WHERE id=?", (args.id,))
        else:
            cursor = db.execute('DELETE FROM reviews WHERE id=?', (args.id,))
        db.commit()
        print(json.dumps({'changed': cursor.rowcount}))
