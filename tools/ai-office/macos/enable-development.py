#!/usr/bin/env python3
"""Apply a reviewed office upgrade while idle, with existing data/auth preserved."""
import importlib.util
import json
from pathlib import Path
import subprocess
import sys


def module(file):
    spec = importlib.util.spec_from_file_location(file.stem.replace('-', '_'), file)
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


def upgrade(package, root=Path('/workspace/ai-office')):
    package, root = Path(package), Path(root)
    services = module(package / 'start-services.py')
    restart_main = module(package / 'restart-main.py')
    restart_control = module(package / 'restart-control.py')
    if root.resolve() != root or (root / 'state').is_symlink():
        raise RuntimeError('office_upgrade_existing_paths_require_review')
    logs = root / 'state/launcher'
    services.private_directory(logs)
    node = root / 'toolchain/node/bin/node'
    if not node.is_file():
        raise RuntimeError('office_upgrade_node_missing')
    # No source credentials or real model calls are needed for the fixed updater checks.
    def run(name, *args):
        with services.private_file(logs / 'development-update.log') as output:
            result = subprocess.run([sys.executable, str(package / name), *map(str, args)],
                                    stdin=subprocess.DEVNULL, stdout=output, stderr=output)
        if result.returncode:
            raise RuntimeError('office_upgrade_' + name.removesuffix('.py').replace('-', '_') + '_stopped_check_log')

    stopped = False
    error = None
    with services.launch_lock(logs / 'open.lock'):
        # Verify the reviewed file hashes and idle state before touching a service.
        run('update-development.py', package / 'development-runtime.json', '--check')
        try:
            if services.health(8790, 'Claw-Empire'):
                code = "import {createOfficeClient} from '/workspace/donknow/scripts/lib/ai-office-client.mjs'; const {request}=await createOfficeClient(); await request('/api/office-policy/runtime/lock','POST',{}, {owner:true});"
                with services.private_file(logs / 'development-update.log') as output:
                    result = subprocess.run([str(node), '--input-type=module', '-e', code],
                                            stdin=subprocess.DEVNULL, stdout=output, stderr=output)
                if result.returncode:
                    raise RuntimeError('office_upgrade_runtime_lock_failed')
            # Each stopper verifies process identity. No broad kill or forced shutdown.
            restart_control.stop()
            stopped = True
            restart_main.stop()
            run('update-development.py', package / 'development-runtime.json')
            run('update-readability.py', package / 'readability.json')
            run('install-control.py', package / 'control-payload.zip')
        except Exception as caught:
            error = caught
    # Release the shared launch lock before normal start/reuse, including rollback errors.
    if stopped:
        try:
            services.start(root)
        except Exception:
            if error is None:
                error = RuntimeError('office_upgrade_restart_required_run_0')
    if error is not None:
        raise error
    return {'updated': True, 'automaticTaskStarted': False,
            'message': '코드 수정 연결을 업데이트했습니다. 전체 대화에서 코드 수정을 선택하세요.'}


if __name__ == '__main__':
    try:
        print(json.dumps(upgrade(Path(__file__).resolve().parent), ensure_ascii=False))
    except Exception as error:
        code = str(error)
        if not code.startswith('office_') or not code.replace('_', '').isalnum():
            code = 'office_upgrade_stopped_existing_state_preserved'
        print(json.dumps({'updated': False, 'reasonCode': code}))
        raise SystemExit(1)
