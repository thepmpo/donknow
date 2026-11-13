"""Build/test the year-feature OFF variant, then always restore its source switch.
Run sequentially: no other Metro/Expo source build may run during this check.
No user data, authentication, server configuration or dependencies are changed.
"""
from pathlib import Path
import os
import subprocess
import tempfile

root = Path(__file__).resolve().parents[1]
flag = root / 'mobile/src/calendar-features.ts'
original = flag.read_text()
if 'yearOverview: true' not in original:
    raise SystemExit('Expected enabled year feature; source preserved.')
with tempfile.TemporaryDirectory(prefix='duck-year-rollback-') as output:
    try:
        flag.write_text(original.replace('yearOverview: true', 'yearOverview: false'))
        subprocess.run(['npx', 'expo', 'export', '--platform', 'web', '--output-dir', output, '--max-workers', '2'], cwd=root/'mobile', env={**os.environ, 'EXPO_NO_TELEMETRY':'1', 'CI':'1'}, check=True)
    finally:
        flag.write_text(original)
    subprocess.run(['node', 'mobile/e2e/calendar-year.mjs'], cwd=root, env={**os.environ, 'CALENDAR_WEB_DIR':output, 'CALENDAR_YEAR_ROLLBACK':'1'}, check=True)
