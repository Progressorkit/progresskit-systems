"""Offline catalog boundary tests using synthetic records and temporary assets."""
import copy
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch


SPEC = importlib.util.spec_from_file_location(
    'progresskit_site_builder', Path(__file__).resolve().parents[1] / 'scripts/build-site.py'
)
BUILDER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BUILDER)


def catalog():
    project = {
        'id': 'synthetic-project', 'slug': 'synthetic-project', 'name': 'Synthetic project',
        'category': 'saas', 'summary': 'Synthetic summary.', 'problem': 'Synthetic problem.',
        'audiences': ['Synthetic audience'], 'motivation': 'Synthetic motivation.',
        'solution': 'Synthetic solution.', 'features': ['Synthetic feature'],
        'technologies': ['Python'], 'stage': 'Prototyp', 'availability': 'Local synthetic fixture.',
        'updatedAt': '2026-10-14', 'architecture': ['Synthetic architecture.'],
        'gallery': [], 'videos': [], 'links': [], 'repository': None,
        'results': [], 'cases': [], 'planned': [], 'remaining': [],
        'sources': [{'id': 'synthetic-source', 'label': 'Synthetic source', 'kind': 'code',
                     'revision': '1234567', 'scope': 'Synthetic fixture only.'}],
        'coverage': 'partial',
    }
    return {'schemaVersion': 1, 'asOf': '2026-10-15', 'projects': [project]}


def engineering_case(source='synthetic-source'):
    return dict.fromkeys(BUILDER.CASE_FIELDS, 'Synthetic test text.') | {'source': source}


class CatalogValidationTests(unittest.TestCase):
    def assertRejected(self, data):
        errors = BUILDER.validate_catalog(data)
        self.assertIsInstance(errors, list)
        self.assertTrue(errors, 'Malformed catalog was accepted.')

    def test_valid_record(self):
        self.assertEqual([], BUILDER.validate_catalog(catalog()))

    def test_invalid_root_structures(self):
        for value in (None, [], 'text', True, 1, {}, {'schemaVersion': 1}):
            with self.subTest(value=value):
                self.assertRejected(value)

    def test_unknown_root_field(self):
        data = catalog()
        data['unreviewed'] = True
        self.assertRejected(data)

    def test_schema_version_requires_exact_supported_integer(self):
        for value in (True, False, 1.0, '1', None, [], {}, 2):
            with self.subTest(value=value):
                data = catalog()
                data['schemaVersion'] = value
                self.assertRejected(data)

    def test_review_date_requires_strict_calendar_date(self):
        for value in ('20261015', '2026-W42-4', '2026-10-15T00:00:00', '2026-02-30',
                      '2026-1-5', '2026-10-15 ', None, [], {}, True):
            with self.subTest(value=value):
                data = catalog()
                data['asOf'] = value
                self.assertRejected(data)

    def test_review_date_cannot_exceed_explicit_audit_date(self):
        data = catalog()
        data['asOf'] = '2026-10-16'
        self.assertRejected(data)
        self.assertEqual('2026-10-15', BUILDER.AUDIT_DATE.isoformat())

    def test_evidence_date_requires_strict_calendar_date(self):
        for value in ('20261014', '2026-W42-3', '2026-10-14T00:00:00', '2026-02-30',
                      '2026-1-5', None, [], {}, True):
            with self.subTest(value=value):
                data = catalog()
                data['projects'][0]['updatedAt'] = value
                self.assertRejected(data)

    def test_evidence_cannot_be_later_than_review(self):
        data = catalog()
        data['projects'][0]['updatedAt'] = '2026-10-16'
        self.assertRejected(data)

    def test_projects_require_nonempty_array(self):
        for value in ([], None, {}, 'text', True):
            with self.subTest(value=value):
                data = catalog()
                data['projects'] = value
                self.assertRejected(data)

    def test_project_requires_object_and_exact_fields(self):
        for value in (None, [], 'text', True, {}, {'id': 'synthetic-project'}):
            with self.subTest(value=value):
                data = catalog()
                data['projects'] = [value]
                self.assertRejected(data)
        data = catalog()
        data['projects'][0]['unreviewed'] = True
        self.assertRejected(data)

    def test_text_fields_reject_malformed_values(self):
        for key in BUILDER.TEXT:
            for value in (None, [], {}, True, '', ' '):
                with self.subTest(key=key, value=value):
                    data = catalog()
                    data['projects'][0][key] = value
                    self.assertRejected(data)

    def test_identifiers_are_unique_and_slugs_match(self):
        data = catalog()
        data['projects'].append(copy.deepcopy(data['projects'][0]))
        self.assertRejected(data)
        for value in ('../escape', 'Uppercase', 'two words', '-prefix', 'trailing-', 'a/b'):
            with self.subTest(value=value):
                data = catalog()
                data['projects'][0]['id'] = data['projects'][0]['slug'] = value
                self.assertRejected(data)
        data = catalog()
        data['projects'][0]['slug'] = 'different-slug'
        self.assertRejected(data)

    def test_category_types_and_unknown_values_do_not_raise(self):
        for value in (None, [], {}, True, 2, 'unknown'):
            with self.subTest(value=value):
                data = catalog()
                data['projects'][0]['category'] = value
                self.assertRejected(data)

    def test_coverage_types_and_unknown_values_do_not_raise(self):
        for value in (None, [], {}, True, 2, 'unknown'):
            with self.subTest(value=value):
                data = catalog()
                data['projects'][0]['coverage'] = value
                self.assertRejected(data)

    def test_stage_types_and_unknown_values_do_not_raise(self):
        for value in ([], {}, True, 2, 'Released'):
            with self.subTest(value=value):
                data = catalog()
                data['projects'][0]['stage'] = value
                self.assertRejected(data)
        data = catalog()
        data['projects'][0].update(stage=None, coverage='verified')
        self.assertRejected(data)

    def test_text_arrays_require_array_of_nonempty_strings(self):
        for key in BUILDER.LISTS:
            for value in (None, 'text', {}, True, [None], [[]], ['']):
                with self.subTest(key=key, value=value):
                    data = catalog()
                    data['projects'][0][key] = value
                    self.assertRejected(data)

    def test_required_arrays_are_nonempty_for_implemented_scope(self):
        for key in ('audiences', 'features', 'technologies', 'architecture'):
            with self.subTest(key=key):
                data = catalog()
                data['projects'][0][key] = []
                self.assertRejected(data)

    def test_absent_source_scope_allows_empty_capability_arrays(self):
        data = catalog()
        data['projects'][0].update(stage=None, coverage='partial', features=[],
                                   technologies=[], architecture=[])
        self.assertEqual([], BUILDER.validate_catalog(data))
        data['projects'][0]['audiences'] = []
        self.assertRejected(data)

    def test_sources_require_valid_unique_ids_and_complete_records(self):
        for value in (None, [], {}, [None], [{}], ['text']):
            with self.subTest(value=value):
                data = catalog()
                data['projects'][0]['sources'] = value
                self.assertRejected(data)
        for source_id in ('bad source', '../escape', [], None):
            with self.subTest(source_id=source_id):
                data = catalog()
                data['projects'][0]['sources'][0]['id'] = source_id
                self.assertRejected(data)
        data = catalog()
        data['projects'][0]['sources'] *= 2
        self.assertRejected(data)

    def test_case_requires_existing_source_reference(self):
        data = catalog()
        data['projects'][0]['cases'] = [engineering_case()]
        self.assertEqual([], BUILDER.validate_catalog(data))
        data['projects'][0]['cases'] = [engineering_case('missing-source')]
        self.assertRejected(data)

    def test_case_requires_complete_object(self):
        for value in (None, {}, [None], [{}], [dict(problem='incomplete')]):
            with self.subTest(value=value):
                data = catalog()
                data['projects'][0]['cases'] = value
                self.assertRejected(data)

    def test_link_and_video_records_require_exact_shape(self):
        for key in ('links', 'videos'):
            for value in (None, {}, 'text', [None], [{}], [{'label': 'Missing URL'}],
                          [{'label': 'Bad type', 'url': []}]):
                with self.subTest(key=key, value=value):
                    data = catalog()
                    data['projects'][0][key] = value
                    self.assertRejected(data)

    def test_external_https_links_are_accepted(self):
        data = catalog()
        data['projects'][0]['links'] = [{'label': 'Example', 'url': 'https://example.com/project?a=1#details'}]
        data['projects'][0]['videos'] = [{'label': 'Video link', 'url': 'https://example.org/video'}]
        self.assertEqual([], BUILDER.validate_catalog(data))

    def test_unsafe_or_malformed_urls_do_not_raise(self):
        urls = ['javascript:alert(1)', 'http://example.com', '//example.com', 'https://',
                'https://[', 'https://[broken]', 'https://example.com:bad',
                'https://example.com:99999', 'https://example.com:0',
                'https://name:secret@example.com', 'https://@example.com',
                'https://example.com\n/private', 'https://example.com\\@evil.example.org',
                'https://localhost', 'https://127.0.0.1', 'https://127.1',
                'https://2130706433', 'https://10.0.0.1', 'https://169.254.169.254',
                'https://[::1]', 'https://[fe80::1]', 'https://internal.local',
                'https://service.internal', 'https://service.invalid', 'https://service.test',
                'https://bad_host.example.com']
        for url in urls:
            with self.subTest(url=url):
                data = catalog()
                data['projects'][0]['links'] = [{'label': 'Synthetic unsafe link', 'url': url}]
                self.assertRejected(data)

    def test_repository_requires_public_github_repository_shape(self):
        data = catalog()
        data['projects'][0]['repository'] = 'https://github.com/example/synthetic-repo'
        self.assertEqual([], BUILDER.validate_catalog(data))
        for value in ([], {}, True, 'https://github.com/', 'https://github.com/example',
                      'https://github.com.evil.example.org/owner/repo',
                      'https://github.com/owner/repo?token=secret', 'https://github.com/owner/repo#section',
                      'https://name@github.com/owner/repo', 'https://['):
            with self.subTest(value=value):
                data = catalog()
                data['projects'][0]['repository'] = value
                self.assertRejected(data)

    def test_gallery_accepts_existing_asset_and_positive_integer_dimensions(self):
        with tempfile.TemporaryDirectory() as temp, patch.object(BUILDER, 'ROOT', Path(temp)):
            image = Path(temp) / 'assets/projects/synthetic/screen.png'
            image.parent.mkdir(parents=True)
            image.write_bytes(b'synthetic asset fixture')
            data = catalog()
            data['projects'][0]['gallery'] = [{'src': 'assets/projects/synthetic/screen.png',
                'alt': 'Synthetic asset', 'caption': 'Synthetic fixture.', 'width': 100, 'height': 200}]
            self.assertEqual([], BUILDER.validate_catalog(data))
            for key, value in [('width', True), ('height', 0), ('width', -1), ('height', '200')]:
                with self.subTest(key=key, value=value):
                    changed = copy.deepcopy(data)
                    changed['projects'][0]['gallery'][0][key] = value
                    self.assertRejected(changed)

    def test_gallery_rejects_malformed_and_missing_assets(self):
        for value in (None, {}, [None], [{}]):
            with self.subTest(value=value):
                data = catalog()
                data['projects'][0]['gallery'] = value
                self.assertRejected(data)
        for src in ('assets/projects/missing.png', '../private.png', '/etc/private.png',
                    'assets/projects/../private.png', 'assets/projects//screen.png',
                    'assets/projects/%2e%2e/private.png', 'assets/projects/a\\private.png',
                    'https://example.com/screen.png', None, []):
            with self.subTest(src=src):
                data = catalog()
                data['projects'][0]['gallery'] = [{'src': src, 'alt': 'Test', 'caption': 'Test',
                                                  'width': 1, 'height': 1}]
                self.assertRejected(data)

    def test_gallery_rejects_file_symlink_outside_asset_directory(self):
        with tempfile.TemporaryDirectory() as temp, patch.object(BUILDER, 'ROOT', Path(temp)):
            base = Path(temp)
            (base / 'assets/projects/synthetic').mkdir(parents=True)
            private = base / 'private.png'
            private.write_bytes(b'synthetic private fixture')
            (base / 'assets/projects/synthetic/screen.png').symlink_to(private)
            data = catalog()
            data['projects'][0]['gallery'] = [{'src': 'assets/projects/synthetic/screen.png',
                'alt': 'Test', 'caption': 'Test', 'width': 1, 'height': 1}]
            self.assertRejected(data)

    def test_gallery_rejects_symlinked_asset_directory(self):
        with tempfile.TemporaryDirectory() as temp, tempfile.TemporaryDirectory() as outside:
            base = Path(temp)
            (base / 'assets').mkdir()
            (base / 'assets/projects').symlink_to(Path(outside), target_is_directory=True)
            (Path(outside) / 'screen.png').write_bytes(b'synthetic private fixture')
            data = catalog()
            data['projects'][0]['gallery'] = [{'src': 'assets/projects/screen.png', 'alt': 'Test',
                                              'caption': 'Test', 'width': 1, 'height': 1}]
            with patch.object(BUILDER, 'ROOT', base):
                self.assertRejected(data)

    def test_private_locations_and_secret_like_values_are_rejected(self):
        for value in ('/home/synthetic/private', '/srv/synthetic/config', '/tmp/synthetic/log',
                      'BEGIN OPENSSH PRIVATE KEY', 'api_key=abcdefghijklmnopqrst'):
            with self.subTest(value=value):
                data = catalog()
                data['projects'][0]['summary'] = value
                self.assertRejected(data)

    def test_nonserializable_data_is_reported_without_throwing(self):
        data = catalog()
        data['projects'][0]['remaining'] = [object()]
        self.assertRejected(data)


if __name__ == '__main__':
    unittest.main()
