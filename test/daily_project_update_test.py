import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

SPEC=importlib.util.spec_from_file_location('daily_project',Path(__file__).resolve().parents[1]/'scripts/daily-project-update.py')
MODULE=importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)

class DailyDocumentTests(unittest.TestCase):
    def test_reruns_keep_entries_skip_generated_commits_and_capture_late_work(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            def git(*args,env=None):
                return subprocess.check_output(['git','-C',str(root),*args],text=True,env=env).strip()
            git('init','--initial-branch=main');git('config','user.name','Fixture');git('config','user.email','fixture@example.test')
            (root/'scripts').mkdir();(root/'docs').mkdir()
            (root/'scripts/build-handoff.py').write_text('print("fixture generation")')
            (root/'work.txt').write_text('first')
            git('add','.');git('commit','-m','First [link](javascript:bad)')
            original=MODULE.ROOT
            try:
                MODULE.ROOT=root;MODULE.main()
                journal=(root/'docs/daily-updates.md').read_text()
                self.assertIn('First ［link］（javascript:bad）',journal)
                self.assertNotIn('[link](javascript:',journal)
                git('add','docs');git('commit','-m','automated docs')
                (root/'work.txt').write_text('late work')
                yesterday=datetime.now(ZoneInfo('Asia/Seoul'))-timedelta(days=1)
                env={**os.environ,'GIT_AUTHOR_DATE':yesterday.isoformat(),'GIT_COMMITTER_DATE':yesterday.isoformat()}
                git('add','work.txt');git('commit','-m','Late committed work',env=env)
                MODULE.main();MODULE.main()
                journal=(root/'docs/daily-updates.md').read_text()
                self.assertEqual(journal.count(' · First ［link］'),1)
                self.assertEqual(journal.count(' · Late committed work'),1)
                self.assertNotIn(' · automated docs',journal)
                self.assertEqual(json.loads((root/'docs/daily-update-state.json').read_text())['processedCommit'],git('rev-parse','HEAD'))
            finally:
                MODULE.ROOT=original
if __name__=='__main__':unittest.main()
