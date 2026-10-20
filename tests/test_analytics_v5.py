"""Synthetic local backend checks; these do not demonstrate production delivery."""
from contextlib import closing
import importlib.util
import os
from pathlib import Path
import sys
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
TEMP=tempfile.TemporaryDirectory()
os.environ.setdefault('PK_PRODUCT_DB',str(Path(TEMP.name)/'product.db'))
sys.path.insert(0,str(ROOT/'analytics'))
spec=importlib.util.spec_from_file_location('v5_analytics_backend',ROOT/'analytics/app.py')
BACKEND=importlib.util.module_from_spec(spec)
sys.modules[spec.name]=BACKEND
old=os.environ.get('PK_ANALYTICS_DB')
os.environ['PK_ANALYTICS_DB']=str(Path(TEMP.name)/'events.db')
spec.loader.exec_module(BACKEND)
if old is None:
    os.environ.pop('PK_ANALYTICS_DB')
else:
    os.environ['PK_ANALYTICS_DB']=old
from fastapi.testclient import TestClient
CLIENT=TestClient(BACKEND.app)


class AnalyticsV5Tests(unittest.TestCase):
    def setUp(self):
        with closing(BACKEND.connect()) as db:
            db.execute('DELETE FROM events');db.commit()

    def test_synthetic_event_is_persisted_with_bounded_fields(self):
        response=CLIENT.post('/_analytics/event',json={
            'event_type':'project_open','path':'/projekty/example/',
            'referrer_host':'EXAMPLE.ORG.','utm_source':'audit',
            'utm_medium':'space is rejected','utm_campaign':'v5-check',
        })
        self.assertEqual(204,response.status_code)
        with closing(BACKEND.connect()) as db:
            rows=db.execute('SELECT * FROM events').fetchall()
        self.assertEqual(1,len(rows))
        self.assertEqual('example.org',rows[0]['referrer_host'])
        self.assertIsNone(rows[0]['utm_medium'])
        self.assertEqual('v5-check',rows[0]['utm_campaign'])

    def test_unsupported_event_and_invalid_path_do_not_write(self):
        for payload in ({'event_type':'unknown','path':'/'},
                        {'event_type':'page_view','path':'https://example.org/'},
                        {'event_type':'page_view','path':'/'+'x'*256}):
            with self.subTest(payload=payload):
                self.assertIn(CLIENT.post('/_analytics/event',json=payload).status_code,(400,422))
        with closing(BACKEND.connect()) as db:
            self.assertEqual(0,db.execute('SELECT COUNT(*) FROM events').fetchone()[0])

    def test_database_has_no_visitor_or_user_agent_fields(self):
        response=CLIENT.post('/_analytics/event',json={
            'event_type':'page_view','path':'/','ip':'synthetic-not-an-ip',
            'user_agent':'synthetic-agent','device_id':'synthetic-id',
        })
        self.assertEqual(204,response.status_code)
        with closing(BACKEND.connect()) as db:
            columns={row['name'] for row in db.execute('PRAGMA table_info(events)')}
            row=db.execute('SELECT * FROM events').fetchone()
        self.assertTrue({'ip','user_agent','device_id'}.isdisjoint(columns))
        self.assertEqual('/',row['path'])


if __name__=='__main__':
    unittest.main()
