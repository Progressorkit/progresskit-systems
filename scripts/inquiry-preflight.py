#!/usr/bin/env python3
"""Read-only inquiry deployment checks. No app import, writes, SMTP or network.

Outputs only named boolean checks; never paths, contact data or secret values.
An immutable SQLite snapshot avoids creation of WAL/SHM by a read-only connection.
A nonempty WAL must be checkpointed by the separately approved migration/worker.
"""
import argparse
import json
import ipaddress
import os
from pathlib import Path
import re
import sqlite3
import stat
from urllib.parse import urlsplit

SECRET_NAMES = ('PK_INQUIRIES_HMAC_SECRET', 'PK_INQUIRIES_READ_TOKEN', 'PK_INQUIRIES_SMTP_PASSWORD')
SCHEMA = {
    'project_inquiries': {'id','created_at','expires_at','contact_name','email','client_type','phone','description','answers_json','status','submission_key','receipt_token_hash','payload_hash'},
    'inquiry_outbox': {'id','inquiry_id','created_at','state','attempts','next_attempt_at','lease_id','lease_until','sent_at','last_error_code'},
    'inquiry_tokens': {'token_hash','created_at','expires_at','used_at'},
    'inquiry_limits': {'scope','bucket','total','expires_at'},
}


def private_file(path, uid, gid):
    try:
        info = path.lstat()
        return (stat.S_ISREG(info.st_mode) and not stat.S_IMODE(info.st_mode) & 0o077
                and info.st_uid == uid and info.st_gid == gid)
    except OSError:
        return False


def private_directory(path, uid, gid):
    try:
        info = path.lstat()
        return (stat.S_ISDIR(info.st_mode) and stat.S_IMODE(info.st_mode) == 0o700
                and info.st_uid == uid and info.st_gid == gid)
    except OSError:
        return False


def inspect(environment=None, *, before_migration=False):
    env = os.environ if environment is None else environment
    checks = []
    def check(name, passed):
        checks.append({'name': name, 'pass': bool(passed)})
        return bool(passed)
    def integer(name, default=''):
        try: return int(env.get(name, default))
        except (ValueError, TypeError): return -1
    uid, gid = integer('PK_INQUIRIES_UID'), integer('PK_INQUIRIES_GID')
    check('POSIX_storage_supported', os.name == 'posix')
    check('PK_INQUIRIES_UID_GID_explicit_nonroot', uid > 0 and gid > 0)
    try:
        proxies=[ipaddress.ip_address(value.strip()) for value in env.get('PK_INQUIRIES_TRUSTED_PROXY_IPS','').split(',')]
        trusted=bool(proxies) and all(not(ip.is_unspecified or ip.is_multicast) for ip in proxies)
    except ValueError: trusted=False
    check('PK_INQUIRIES_TRUSTED_PROXY_IPS_exact_addresses',trusted)
    try:
        origin = urlsplit(env.get('PK_PUBLIC_ORIGIN', ''))
        valid_origin = (origin.scheme == 'https' and bool(origin.hostname) and origin.hostname not in ('localhost','127.0.0.1','::1')
                        and not any((origin.path,origin.query,origin.fragment,origin.username,origin.password)) and origin.port != 0)
    except ValueError:
        valid_origin = False
    check('PK_PUBLIC_ORIGIN_production_HTTPS', valid_origin)
    check('PK_INQUIRIES_RETENTION_DAYS_1_to_180', 1 <= integer('PK_INQUIRIES_RETENTION_DAYS','180') <= 180)
    check('plaintext_secret_environment_absent', all(not env.get(name) for name in SECRET_NAMES))
    values = {}
    for name in SECRET_NAMES:
        supplied = env.get(name + '_FILE', '')
        file = Path(supplied) if supplied else None
        safe = bool(file and file.is_absolute() and private_file(file,uid,gid) and private_directory(file.parent,uid,gid))
        check(name + '_FILE_private', safe)
        value = ''
        if safe:
            try:
                if file.stat().st_size <= 4096:
                    value = file.read_text(encoding='utf-8').rstrip('\r\n')
            except (OSError,UnicodeError): pass
        if name.endswith('PASSWORD'):
            valid = bool(value) and '\x00' not in value and '\n' not in value and '\r' not in value
        else:
            valid = 32 <= len(value) <= 512 and all(33 <= ord(c) <= 126 for c in value)
        check(name + '_valid', valid)
        values[name] = value
    check('HMAC_and_private_read_secrets_distinct', bool(values[SECRET_NAMES[0]] and values[SECRET_NAMES[1]])
          and values[SECRET_NAMES[0]] != values[SECRET_NAMES[1]])
    host = env.get('PK_INQUIRIES_SMTP_HOST','')
    check('PK_INQUIRIES_SMTP_HOST_configured', bool(host) and len(host)<=253 and bool(re.fullmatch(r'[A-Za-z0-9.-]+',host)))
    check('PK_INQUIRIES_SMTP_MODE_verified_TLS', env.get('PK_INQUIRIES_SMTP_MODE') in ('starttls','ssl'))
    check('PK_INQUIRIES_SMTP_PORT_valid', 1 <= integer('PK_INQUIRIES_SMTP_PORT') <= 65535)
    username = env.get('PK_INQUIRIES_SMTP_USERNAME','')
    check('PK_INQUIRIES_SMTP_USERNAME_configured', bool(username) and not any(c in username for c in '\r\n\x00'))
    sender = env.get('PK_INQUIRIES_SMTP_FROM','notifications@progresskit.pl')
    check('PK_INQUIRIES_SMTP_FROM_safe', bool(re.fullmatch(r'[A-Za-z0-9.!#$%&\x27*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,63}',sender)))
    directory = env.get('PK_INQUIRIES_DATA_DIR','')
    database_value = env.get('PK_INQUIRIES_DB') or env.get('PK_PRODUCT_DB') or (str(Path(directory)/'product.db') if directory else '')
    database = Path(database_value) if database_value else None
    safe_db = bool(database and database.is_absolute() and private_file(database,uid,gid))
    check('database_matches_existing_shared_volume', bool(directory and database and database == Path(directory)/'product.db'))
    check('persistent_product_database_private', safe_db)
    check('persistent_database_parent_0700', bool(database and private_directory(database.parent,uid,gid)))
    for suffix in ('-wal','-shm','-journal'):
        path = Path(str(database)+suffix) if database else None
        check('database'+suffix+'_private_if_present', bool(path and (not path.exists() and not path.is_symlink() or private_file(path,uid,gid))))
    schema_ok = False
    if not before_migration:
        wal = Path(str(database)+'-wal') if database else None
        try: checkpointed = bool(wal and (not wal.exists() or wal.stat().st_size <= 32))
        except OSError: checkpointed = False
        check('schema_snapshot_checkpointed', checkpointed)
        if safe_db and checkpointed:
            try:
                db = sqlite3.connect(database.as_uri()+'?mode=ro&immutable=1',uri=True)
                try:
                    schema_ok = all(columns <= {row[1] for row in db.execute('PRAGMA table_info('+table+')')}
                                    for table,columns in SCHEMA.items())
                finally: db.close()
            except (sqlite3.Error, OSError, ValueError): pass
        check('required_inquiry_schema_present_readonly', schema_ok)
    passed = all(item['pass'] for item in checks)
    status = ('PRECONDITIONS_PASS' if before_migration else 'CONFIG_PASS') if passed else 'FAIL'
    return {'status':status,'configuration_ready':passed and not before_migration,'deployment_approved':False,
            'schema_checked':not before_migration,'checks':checks,
            'external_gates':['owner_deployment_approval','production_SMTP_delivery','proxy_internal_deny_and_no_logs',
                              'bounded_backup_retention','mail_metadata_retention','worker_monitoring']}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--before-migration',action='store_true',help='Check prerequisites only; never report configuration_ready')
    args=parser.parse_args()
    result=inspect(before_migration=args.before_migration)
    print(json.dumps(result,ensure_ascii=False,indent=2))
    return 0 if result['status']!='FAIL' else 1


if __name__=='__main__': raise SystemExit(main())
