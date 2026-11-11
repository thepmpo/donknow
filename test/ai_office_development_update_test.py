"""Runtime update fixtures only; no real office files, servers or models."""
import copy
import importlib.util
from pathlib import Path
import sqlite3
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    'office_development_update', ROOT / 'tools/ai-office/install/update-development.py')
module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(module)


class DevelopmentRuntimeUpdateTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.runtime = self.root / 'runtime'
        self.state = self.root / 'state'
        self.runtime.mkdir()
        self.state.mkdir()
        (self.runtime / 'server').mkdir()
        self.payload = {'version': 1, 'files': []}
        self.originals = {}
        for relative in sorted(module.FILES):
            original = ('original ' + relative + '\n').encode()
            content = 'reviewed update ' + relative + '\n'
            (self.runtime / relative).write_bytes(original)
            self.originals[relative] = original
            self.payload['files'].append({
                'path': relative, 'beforeSha256': module.digest(original),
                'afterSha256': module.digest(content.encode()), 'content': content,
            })
        with sqlite3.connect(self.state / 'office.sqlite') as database:
            database.executescript(
                'CREATE TABLE tasks(status TEXT); CREATE TABLE agents(status TEXT);'
                'CREATE TABLE office_task_permissions(state TEXT);')
        (self.runtime / '.env').write_text('fixture configuration: preserve')
        (self.state / 'auth.json').write_text('fixture auth: preserve')
        (self.state / 'control-access.key').write_text('fixture key: preserve')
        self.verifications = []

    def snapshot(self, directory):
        return {str(p.relative_to(directory)): p.read_bytes()
                for p in directory.rglob('*') if p.is_file()}

    def verify(self, log):
        self.verifications.append(log)
        for entry in self.payload['files']:
            self.assertEqual((self.runtime / entry['path']).read_text(), entry['content'])
        log.write_text('fixture validation passed\n')

    def assert_original_files(self):
        for relative, original in self.originals.items():
            self.assertEqual((self.runtime / relative).read_bytes(), original)

    def assert_no_update_side_effects(self, state_before):
        self.assertEqual(self.snapshot(self.state), state_before)
        self.assertFalse((self.state / 'development-backups').exists())
        self.assertEqual(self.verifications, [])

    def test_exact_two_file_update_backs_up_and_preserves_auth_database_configuration(self):
        self.assertEqual(module.FILES, {'server/office-policy.ts', 'server/office-policy.test.ts'})
        state_before = self.snapshot(self.state)
        environment_before = (self.runtime / '.env').read_bytes()
        result = module.update(self.runtime, self.state, self.payload, self.verify)
        self.assertTrue(result['updated'])
        self.assertTrue(result['restartRequired'])
        self.assertFalse(result['authenticationChanged'])
        self.assertFalse(result['automaticTaskStarted'])
        self.assertFalse(result['automaticPublication'])
        self.assertEqual(len(self.verifications), 1)
        for relative, original in self.originals.items():
            self.assertEqual((Path(result['backup']) / relative).read_bytes(), original)
        for relative, original in state_before.items():
            self.assertEqual((self.state / relative).read_bytes(), original)
        self.assertEqual((self.runtime / '.env').read_bytes(), environment_before)

    def test_check_only_leaves_files_backups_database_and_verifier_untouched(self):
        runtime_before, state_before = self.snapshot(self.runtime), self.snapshot(self.state)
        result = module.update(self.runtime, self.state, self.payload, self.verify, check_only=True)
        self.assertEqual(result, {'ready': True, 'needsUpdate': True, 'restartRequired': True})
        self.assertEqual(self.snapshot(self.runtime), runtime_before)
        self.assert_no_update_side_effects(state_before)

    def test_idempotent_update_and_check_do_not_reverify_or_create_another_backup(self):
        module.update(self.runtime, self.state, self.payload, self.verify)
        runtime_before, state_before = self.snapshot(self.runtime), self.snapshot(self.state)
        result = module.update(self.runtime, self.state, self.payload, self.verify)
        self.assertEqual(result, {'updated': False, 'alreadyInstalled': True, 'restartRequired': True})
        checked = module.update(self.runtime, self.state, self.payload, self.verify, check_only=True)
        self.assertFalse(checked['needsUpdate'])
        self.assertEqual(len(self.verifications), 1)
        self.assertEqual(self.snapshot(self.runtime), runtime_before)
        self.assertEqual(self.snapshot(self.state), state_before)

    def test_unknown_source_hash_and_corrupt_payload_are_preserved(self):
        state_before = self.snapshot(self.state)
        relative = self.payload['files'][0]['path']
        (self.runtime / relative).write_text('user edited source')
        with self.assertRaisesRegex(RuntimeError, 'existing_development_changes_preserved'):
            module.update(self.runtime, self.state, self.payload, self.verify)
        self.assertEqual((self.runtime / relative).read_text(), 'user edited source')
        self.assert_no_update_side_effects(state_before)
        (self.runtime / relative).write_bytes(self.originals[relative])
        self.payload['files'][0]['content'] = 'tampered update'
        with self.assertRaisesRegex(RuntimeError, 'package_hash_mismatch'):
            module.update(self.runtime, self.state, self.payload, self.verify)
        self.assert_original_files()
        self.assert_no_update_side_effects(state_before)

    def test_source_symlink_preserves_external_target(self):
        relative = self.payload['files'][0]['path']
        target = self.root / 'external.ts'
        target.write_bytes(self.originals[relative])
        file = self.runtime / relative
        file.unlink()
        file.symlink_to(target)
        state_before = self.snapshot(self.state)
        with self.assertRaisesRegex(RuntimeError, 'path_requires_review'):
            module.update(self.runtime, self.state, self.payload, self.verify)
        self.assertTrue(file.is_symlink())
        self.assertEqual(target.read_bytes(), self.originals[relative])
        self.assert_no_update_side_effects(state_before)

    def test_backup_symlink_is_preserved_without_source_changes(self):
        target = self.root / 'external-backups'
        target.mkdir()
        (target / 'sentinel').write_text('keep')
        (self.state / 'development-backups').symlink_to(target, target_is_directory=True)
        with self.assertRaisesRegex(RuntimeError, 'backup_requires_review'):
            module.update(self.runtime, self.state, self.payload, self.verify)
        self.assert_original_files()
        self.assertEqual(self.snapshot(target), {'sentinel': b'keep'})
        self.assertEqual(self.verifications, [])

    def test_verifier_failure_restores_both_files_and_keeps_auth_and_database(self):
        state_before = self.snapshot(self.state)

        def failing(log):
            self.verify(log)
            raise RuntimeError('fixture verification failed')

        with self.assertRaisesRegex(RuntimeError, 'fixture verification failed'):
            module.update(self.runtime, self.state, self.payload, failing)
        self.assert_original_files()
        for relative, original in state_before.items():
            self.assertEqual((self.state / relative).read_bytes(), original)
        self.assertEqual((self.runtime / '.env').read_text(), 'fixture configuration: preserve')

    def test_real_task_start_during_verification_rolls_back_without_resetting_task(self):
        def task_started(log):
            self.verify(log)
            with sqlite3.connect(self.state / 'office.sqlite') as database:
                database.execute("INSERT INTO tasks VALUES ('in_progress')")

        with self.assertRaisesRegex(RuntimeError, 'wait_for_running_task'):
            module.update(self.runtime, self.state, self.payload, task_started)
        self.assert_original_files()
        with sqlite3.connect(self.state / 'office.sqlite') as database:
            self.assertEqual(database.execute('SELECT status FROM tasks').fetchall(), [('in_progress',)])
        self.assertEqual((self.state / 'auth.json').read_text(), 'fixture auth: preserve')

    def test_sqlite_idle_checks_reject_running_task_agent_and_permission_before_write(self):
        for table, field, value in [('tasks', 'status', 'in_progress'), ('agents', 'status', 'working'),
                                    ('office_task_permissions', 'state', 'running')]:
            with self.subTest(table=table):
                with sqlite3.connect(self.state / 'office.sqlite') as database:
                    database.execute(f'INSERT INTO {table} ({field}) VALUES (?)', (value,))
                state_before = self.snapshot(self.state)
                for check_only in [True, False]:
                    with self.assertRaisesRegex(RuntimeError, 'wait_for_running_task'):
                        module.update(self.runtime, self.state, self.payload, self.verify, check_only=check_only)
                    self.assert_original_files()
                    self.assert_no_update_side_effects(state_before)
                with sqlite3.connect(self.state / 'office.sqlite') as database:
                    database.execute(f'DELETE FROM {table}')

    def test_database_symlink_is_rejected_without_writing_the_target(self):
        database = self.state / 'office.sqlite'
        external = self.root / 'external.sqlite'
        database.rename(external)
        original = external.read_bytes()
        database.symlink_to(external)
        with self.assertRaisesRegex(RuntimeError, 'database_requires_review'):
            module.update(self.runtime, self.state, self.payload, self.verify)
        self.assertTrue(database.is_symlink())
        self.assertEqual(external.read_bytes(), original)
        self.assert_original_files()
        self.assertFalse((self.state / 'development-backups').exists())

    def test_malformed_or_expanded_manifest_never_changes_source_or_state(self):
        cases = [
            {'version': 2, 'files': self.payload['files']}, {'version': 1, 'files': []},
            {'version': 1, 'files': [self.payload['files'][0]] * 2},
            {'version': 1, 'files': [*self.payload['files'], {'path': '.env'}]},
            {'version': 1, 'files': [{}]},
        ]
        escaped = copy.deepcopy(self.payload)
        escaped['files'][0]['path'] = '../outside.ts'
        cases.append(escaped)
        state_before = self.snapshot(self.state)
        for payload in cases:
            with self.subTest(payload=payload):
                with self.assertRaises((RuntimeError, KeyError, TypeError)):
                    module.update(self.runtime, self.state, payload, self.verify)
                self.assert_original_files()
                self.assert_no_update_side_effects(state_before)


if __name__ == '__main__':
    unittest.main()
