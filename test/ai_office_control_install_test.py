import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import zipfile
spec = importlib.util.spec_from_file_location('control_install', Path(__file__).resolve().parents[1] / 'tools/ai-office/install/install-control.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ControlInstallTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / 'office'
        (self.root / 'state').mkdir(parents=True)
        (self.root / 'state/office.sqlite').write_bytes(b'original fixture database')
        (self.root / 'state/auth.fixture').write_bytes(b'original fixture authentication')
        self.archive = Path(self.temp.name) / 'payload.zip'
        self.data = {name: ('fixture ' + name).encode() for name in module.ALLOWED}
        self.write_package()

    def write_package(self, corrupt=False):
        files = {name: hashlib.sha256(value).hexdigest() for name, value in self.data.items()}
        package_id = hashlib.sha256(json.dumps(files, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
        with zipfile.ZipFile(self.archive, 'w') as bundle:
            bundle.writestr('manifest.json', json.dumps(dict(version=1, packageId=package_id, files=files)))
            for name, value in self.data.items():
                bundle.writestr(name, b'changed' if corrupt and name == 'server.mjs' else value)

    def test_install_is_versioned_idempotent_and_preserves_database_authentication(self):
        first = module.install(self.archive, self.root)
        second = module.install(self.archive, self.root)
        self.assertEqual(first['packageId'], second['packageId'])
        self.assertEqual((self.root / 'state/office.sqlite').read_bytes(), b'original fixture database')
        self.assertEqual((self.root / 'state/auth.fixture').read_bytes(), b'original fixture authentication')
        self.assertTrue((self.root / 'bin/control.sh').is_file())
        self.assertEqual((self.root / 'control/current.json').stat().st_mode & 0o777, 0o600)

    def test_modified_console_source_is_not_overwritten(self):
        installed = module.install(self.archive, self.root)
        server = self.root / 'control/versions' / installed['packageId'] / 'server.mjs'
        server.write_text('user modifications')
        with self.assertRaisesRegex(RuntimeError, 'existing_control_changes'):
            module.install(self.archive, self.root)
        self.assertEqual(server.read_text(), 'user modifications')

    def test_corrupted_zip_is_refused_before_install(self):
        self.write_package(corrupt=True)
        with self.assertRaisesRegex(RuntimeError, 'package_corrupt'):
            module.install(self.archive, self.root)
        self.assertFalse((self.root / 'control').exists())

    def test_existing_launcher_is_preserved(self):
        (self.root / 'bin').mkdir()
        (self.root / 'bin/control.sh').write_text('user launcher')
        with self.assertRaisesRegex(RuntimeError, 'existing_launcher'):
            module.install(self.archive, self.root)
        self.assertEqual((self.root / 'bin/control.sh').read_text(), 'user launcher')


if __name__ == '__main__':
    unittest.main()
