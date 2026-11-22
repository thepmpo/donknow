"""Package the committed repository as a source/document handoff, never local secrets.

Run after committing documentation. No network access or production state is used.
The archive contains a committed source snapshot, a startup note, and SHA-256 manifest.
"""
from pathlib import Path, PurePosixPath
import hashlib
import json
import re
import subprocess
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'deliverables' / 'docen-complete-handoff.zip'


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)


def forbidden(name):
    path = PurePosixPath(name)
    if path.is_absolute() or '..' in path.parts:
        return True
    parts = [part.lower() for part in path.parts]
    basename = parts[-1] if parts else ''
    if any(part in {'.git', 'node_modules', 'data', 'backups', 'deliverables'} for part in parts):
        return True
    if basename == '.env' or (basename.startswith('.env.') and basename != '.env.example'):
        return True
    if basename in {'auth.json', '.token-key', 'credentials', 'credentials.json'}:
        return True
    if basename == '.npmrc' and name != 'website/.npmrc':
        return True
    return bool(re.search(r'\.(?:sqlite(?:3)?|db|db-wal|db-shm|pem|p8|p12|pfx|key|keystore|mobileprovision)$', basename))


def main():
    # Read the committed tree, not the user's local environment or untracked files.
    commit = git('rev-parse', 'HEAD').decode().strip()
    if git('status', '--porcelain', '--untracked-files=no').strip():
        raise SystemExit('Commit tracked changes first so source and manifest use one snapshot.')
    rows = git('ls-tree', '-r', '-z', 'HEAD').split(b'\0')
    expected = set()
    for row in rows:
        if not row:
            continue
        meta, raw_name = row.split(b'\t', 1)
        mode, kind, _object = meta.decode().split()
        name = raw_name.decode()
        if kind != 'blob' or mode == '120000':
            raise SystemExit('Unsupported submodule/symlink in tracked source: ' + name)
        if forbidden(name):
            raise SystemExit('Refusing credential/data-shaped tracked path: ' + name)
        expected.add(name)
    required = {
        'docs/REUSABLE-APP-START-HERE.md', 'docs/reusable-app-foundation.md',
        'docs/app-foundation-modules.json', 'docs/app-foundation-release-checklist.md',
        'docs/templates/new-app-project-contract.md', 'docs/templates/new-app-ai-handoff.md',
        'docs/DOCEN-START-HERE.md', 'docs/docen-product-build-playbook.md',
        'mobile/App.tsx', 'server.js', 'package-lock.json', 'mobile/package-lock.json',
    }
    if not required <= expected:
        raise SystemExit('Required source/documents are missing from committed tree.')
    OUT.parent.mkdir(exist_ok=True)
    entries = []
    with tempfile.TemporaryDirectory(prefix='docen-source-handoff-') as directory:
        snapshot = Path(directory) / 'source.zip'
        subprocess.run(['git', 'archive', '--format=zip', 'HEAD', '-o', str(snapshot)], cwd=ROOT, check=True)
        candidate = Path(directory) / 'complete.zip'
        with zipfile.ZipFile(snapshot) as source, zipfile.ZipFile(candidate, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
            actual = {i.filename for i in source.infolist() if not i.is_dir()}
            if actual != expected:
                raise SystemExit('git archive excluded or added tracked files; inspect export rules.')
            for name in sorted(actual):
                if forbidden(name):
                    raise SystemExit('Forbidden archive member: ' + name)
                data = source.read(name)
                if name == 'website/.npmrc':
                    settings = [line.strip() for line in data.decode().splitlines() if line.strip() and not line.lstrip().startswith(('#', ';'))]
                    if any(not re.fullmatch(r'(?:fund|audit)\s*=\s*(?:true|false)', line) for line in settings):
                        raise SystemExit('Unexpected setting in tracked public npm config.')
                archive.writestr(name, data)
                entries.append({'path': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
            manifest = {
                'schemaVersion': 1, 'sourceCommit': commit,
                'repository': 'https://github.com/thepmpo/donknow',
                'sourceFileCount': len(entries), 'sourceBytes': sum(e['bytes'] for e in entries),
                'entryPoint': 'docs/REUSABLE-APP-START-HERE.md',
                'docenEntryPoint': 'docs/DOCEN-START-HERE.md',
                'scope': 'All committed source, docs, tests, locks and reference assets; no Git history or local/production data.',
                'exclusions': ['untracked files', 'environment secrets', 'DBs', 'private keys', 'node_modules', 'Git internals', 'user attachments outside committed synthetic/reference assets'],
                'files': entries,
            }
            archive.writestr('PACKAGE-MANIFEST.json', json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
            archive.writestr('PACKAGE-START-HERE.txt',
                'docen 전체 소스·문서·테스트·자산 인계\n\n'
                '새 앱 제작: docs/REUSABLE-APP-START-HERE.md부터 읽으세요.\n'
                'docen 이어받기: docs/DOCEN-START-HERE.md부터 읽으세요.\n'
                '36개 공통 모듈의 파일/의존/검증은 docs/app-foundation-modules.json에 있습니다.\n'
                '홈페이지/배경/웹/어드민은 docs/docen-product-build-playbook.md를 읽으세요.\n'
                '새 제품 계약/인계 양식은 docs/templates/에 있습니다.\n\n'
                'sourceCommit: ' + commit + '\n'
                'PACKAGE-MANIFEST.json에 각 원본 파일의 크기/SHA-256이 있습니다.\n'
                '이 ZIP은 실행 준비된 범용 SDK가 아니라 docen 소스와 공통 추출 절차입니다.\n'
                '새 앱은 새로운 제품 ID/DB/키/외부앱/서명을 준비해야 합니다.\n'
                '실제 DB/키/토큰/세션/개인 첨부/node_modules/Git 이력은 포함하지 않습니다.\n'
                '처음에는 개발 환경에서 lockfile로 의존성을 설치하고 관련 검사를 실행하세요.\n'
                '파일이 있다는 사실은 실계정 연결·배포·스토어/실기기 성공 증거가 아닙니다.\n')
        with zipfile.ZipFile(candidate) as archive:
            if archive.testzip() is not None:
                raise SystemExit('Archive CRC check failed.')
            checked = json.loads(archive.read('PACKAGE-MANIFEST.json'))
            for entry in checked['files']:
                data = archive.read(entry['path'])
                if len(data) != entry['bytes'] or hashlib.sha256(data).hexdigest() != entry['sha256']:
                    raise SystemExit('Archive SHA-256 check failed: ' + entry['path'])
        OUT.write_bytes(candidate.read_bytes())
    print(json.dumps({'archive': str(OUT.relative_to(ROOT)), 'sourceCommit': commit,
                      'sourceFiles': len(entries), 'zipBytes': OUT.stat().st_size,
                      'zipSha256': hashlib.sha256(OUT.read_bytes()).hexdigest(),
                      'verification': 'CRC + per-file SHA-256 + tracked-tree equality + path exclusions passed'}, ensure_ascii=False))


if __name__ == '__main__':
    main()
