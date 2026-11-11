import hashlib
import importlib.util
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('readability_update', Path(__file__).resolve().parents[1] / 'tools/ai-office/install/update-readability.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ReadabilityUpdateTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.runtime, self.state = Path(self.temp.name) / 'runtime', Path(self.temp.name) / 'state'
        self.runtime.mkdir()
        self.state.mkdir()
        (self.runtime / 'dist').mkdir()
        (self.runtime / 'dist/index.html').write_text('original UI')
        (self.runtime / '.env').write_text('private fixture configuration')
        entries = []
        for relative in sorted(module.FILES):
            before, after = 'before ' + relative, 'after ' + relative
            file = self.runtime / relative
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_text(before)
            entries.append(dict(path=relative, beforeSha256=module.digest(before.encode()), afterSha256=module.digest(after.encode()), content=after))
        self.payload = dict(version=1, files=entries)
        with sqlite3.connect(self.state / 'office.sqlite') as db:
            db.executescript("CREATE TABLE tasks(status TEXT); CREATE TABLE agents(status TEXT); CREATE TABLE office_task_permissions(state TEXT);")
        self.database_before = (self.state / 'office.sqlite').read_bytes()

    def build(self, staging):
        staging.mkdir()
        (staging / 'index.html').write_text('larger UI')

    def test_ui_swap_preserves_database_and_auth_configuration(self):
        result = module.update(self.runtime, self.state, self.payload, self.build)
        self.assertTrue(result['updated'])
        self.assertEqual((self.runtime / 'dist/index.html').read_text(), 'larger UI')
        self.assertEqual((Path(result['backup']) / 'previous-dist/index.html').read_text(), 'original UI')
        self.assertEqual((self.runtime / '.env').read_text(), 'private fixture configuration')
        self.assertEqual((self.state / 'office.sqlite').read_bytes(), self.database_before)
        self.assertTrue(module.update(self.runtime, self.state, self.payload, self.build)['alreadyInstalled'])

    def test_running_review_is_refused_before_source_changes(self):
        with sqlite3.connect(self.state / 'office.sqlite') as db:
            db.execute("INSERT INTO tasks VALUES ('in_progress')")
        with self.assertRaisesRegex(RuntimeError, 'review_running'):
            module.update(self.runtime, self.state, self.payload, self.build)
        self.assertFalse((self.state / 'ui-backups').exists())
        self.assertEqual((self.runtime / 'dist/index.html').read_text(), 'original UI')

    def test_build_failure_restores_source_and_keeps_live_ui(self):
        def fail(staging):
            raise RuntimeError('build failed')
        with self.assertRaisesRegex(RuntimeError, 'build failed'):
            module.update(self.runtime, self.state, self.payload, fail)
        for entry in self.payload['files']:
            self.assertEqual(module.digest((self.runtime / entry['path']).read_bytes()), entry['beforeSha256'])
        self.assertEqual((self.runtime / 'dist/index.html').read_text(), 'original UI')

    def test_user_source_changes_are_preserved(self):
        file = self.runtime / self.payload['files'][0]['path']
        file.write_text('user changes')
        with self.assertRaisesRegex(RuntimeError, 'existing_ui_changes'):
            module.update(self.runtime, self.state, self.payload, self.build)
        self.assertEqual(file.read_text(), 'user changes')

    def test_review_started_during_build_prevents_swap_and_restores_source(self):
        count = []
        def idle():
            count.append(1)
            if len(count) == 2:
                raise RuntimeError('office_review_running_wait_until_finished')
        with self.assertRaisesRegex(RuntimeError, 'review_running'):
            module.update(self.runtime, self.state, self.payload, self.build, idle)
        self.assertEqual((self.runtime / 'dist/index.html').read_text(), 'original UI')
        for entry in self.payload['files']:
            self.assertEqual(module.digest((self.runtime / entry['path']).read_bytes()), entry['beforeSha256'])

    def test_package_hash_mismatch_is_refused(self):
        self.payload['files'][0]['content'] = 'tampered'
        with self.assertRaisesRegex(RuntimeError, 'package_hash_mismatch'):
            module.update(self.runtime, self.state, self.payload, self.build)
        self.assertFalse((self.state / 'ui-backups').exists())


if __name__ == '__main__':
    unittest.main()
