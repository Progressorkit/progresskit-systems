"""Preflight performs no writes and reports only safe named configuration checks."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import sqlite3
import tempfile
import unittest

spec=importlib.util.spec_from_file_location('inquiry_preflight',Path(__file__).resolve().parents[1]/'scripts/inquiry-preflight.py')
preflight=importlib.util.module_from_spec(spec);spec.loader.exec_module(preflight)


class InquiryPreflightTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name);self.root.chmod(0o700)
        self.database=self.root/'product.db'
        with sqlite3.connect(self.database) as db:
            for name,columns in preflight.SCHEMA.items():
                db.execute('CREATE TABLE '+name+' ('+','.join(column+' TEXT' for column in sorted(columns))+')')
        self.database.chmod(0o600)
        self.env={'PK_INQUIRIES_UID':str(os.geteuid()),'PK_INQUIRIES_GID':str(os.getegid()),
                  'PK_PUBLIC_ORIGIN':'https://progresskit.pl','PK_PRODUCT_DB':str(self.database),
                  'PK_INQUIRIES_DATA_DIR':str(self.root),'PK_INQUIRIES_SMTP_HOST':'smtp.example.com',
                  'PK_INQUIRIES_SMTP_PORT':'587','PK_INQUIRIES_SMTP_MODE':'starttls',
                  'PK_INQUIRIES_SMTP_USERNAME':'fixture','PK_INQUIRIES_TRUSTED_PROXY_IPS':'172.30.0.2'}
        for name,value in zip(preflight.SECRET_NAMES,('a'*48,'b'*48,'fixture-smtp-password')):
            path=self.root/(name+'.secret');path.write_text(value);path.chmod(0o600)
            self.env[name+'_FILE']=str(path)
        # Fixtures may run as root in CI; ownership checks remain real, while the
        # non-root deployment policy is asserted separately by affected cases.
        self.root_policy=os.geteuid()==0 or os.getegid()==0

    def valid(self):
        result=preflight.inspect(self.env)
        if self.root_policy:
            failures={c['name'] for c in result['checks'] if not c['pass']}
            self.assertEqual(failures,{'PK_INQUIRIES_UID_GID_explicit_nonroot'})
        return result

    def snapshots(self):
        return {str(p.relative_to(self.root)):(p.stat().st_mode,hashlib.sha256(p.read_bytes()).hexdigest()) for p in self.root.rglob('*') if p.is_file()}

    def test_safe_config_schema_and_no_content_or_filesystem_changes(self):
        before=self.snapshots();result=self.valid();after=self.snapshots()
        self.assertEqual(before,after)
        self.assertTrue(result['schema_checked'])
        self.assertFalse(result['deployment_approved'])
        if not self.root_policy:
            self.assertEqual(result['status'],'CONFIG_PASS');self.assertTrue(result['configuration_ready'])
        rendered=json.dumps(result)
        for value in ('a'*48,'b'*48,'fixture-smtp-password',str(self.root),'smtp.example.com'):
            self.assertNotIn(value,rendered)

    def test_missing_secrets_or_equal_keys_fail_closed(self):
        for change in ({'PK_INQUIRIES_HMAC_SECRET_FILE':''},
                       {'PK_INQUIRIES_READ_TOKEN_FILE':self.env['PK_INQUIRIES_HMAC_SECRET_FILE']},
                       {'PK_INQUIRIES_SMTP_PASSWORD_FILE':''}):
            result=preflight.inspect(self.env|change)
            self.assertEqual(result['status'],'FAIL');self.assertFalse(result['configuration_ready'])

    def test_unsafe_database_and_sidecars_not_repaired(self):
        self.database.chmod(0o644)
        before=self.snapshots();result=preflight.inspect(self.env)
        self.assertFalse(next(c['pass'] for c in result['checks'] if c['name']=='persistent_product_database_private'))
        self.assertEqual(before,self.snapshots());self.database.chmod(0o600)
        for suffix in ('-wal','-shm'):
            sidecar=Path(str(self.database)+suffix);sidecar.write_bytes(b'fixture');sidecar.chmod(0o644)
            before=self.snapshots();result=preflight.inspect(self.env)
            self.assertFalse(next(c['pass'] for c in result['checks'] if c['name']=='database'+suffix+'_private_if_present'))
            self.assertEqual(before,self.snapshots());sidecar.unlink()

    def test_origin_tls_proxy_policy_and_missing_schema_never_report_ready(self):
        for change in ({'PK_PUBLIC_ORIGIN':'http://progresskit.pl'}, {'PK_INQUIRIES_SMTP_MODE':'plain'},
                       {'PK_INQUIRIES_TRUSTED_PROXY_IPS':'*'}, {'PK_INQUIRIES_RETENTION_DAYS':'181'}):
            self.assertEqual(preflight.inspect(self.env|change)['status'],'FAIL')
        with sqlite3.connect(self.database) as db: db.execute('DROP TABLE inquiry_outbox')
        result=preflight.inspect(self.env)
        self.assertFalse(next(c['pass'] for c in result['checks'] if c['name']=='required_inquiry_schema_present_readonly'))
        early=preflight.inspect(self.env,before_migration=True)
        self.assertFalse(early['schema_checked']);self.assertFalse(early['configuration_ready'])
        self.assertNotEqual(early['status'],'CONFIG_PASS')


if __name__=='__main__':unittest.main()
