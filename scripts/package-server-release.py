"""Package current runtime sources without Git metadata, dependencies or private data."""
import hashlib
import io
import json
import pathlib
import subprocess
import tarfile
from datetime import datetime, timezone

root = pathlib.Path(__file__).resolve().parents[1]
output = root / 'local-state/server-deploy/releases'
output.mkdir(parents=True, exist_ok=True)
git = subprocess.run(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], cwd=root, check=True, capture_output=True)
blocked = {'.git', 'node_modules', '.next', 'bin', 'obj', 'App_Data', 'test-results', 'backups', 'local-state', '.vercel', '.tmp'}
files = []
for relative in sorted(set(git.stdout.decode().split('\0'))):
    if not relative or not (relative.startswith(('web/', 'backend/Ottlog.Api/', 'miniprogram/src/', 'deploy/')) or relative in {'.dockerignore', 'scripts/backup.py'}):
        continue
    path = pathlib.PurePosixPath(relative)
    if blocked.intersection(path.parts) or path.name in {'.npmrc', 'admin-password.txt', 'appsettings.Development.json'} or path.name.startswith('.env') and path.name != '.env.example':
        continue
    source = root / relative
    if not source.exists():
        continue
    if source.is_symlink() or not source.is_file() or not source.resolve().is_relative_to(root):
        raise ValueError('Unsafe runtime source: ' + relative)
    files.append((relative, source.read_bytes()))
manifest = {relative: hashlib.sha256(content).hexdigest() for relative, content in files}
encoded = json.dumps(manifest, sort_keys=True, separators=(',', ':')).encode()
release = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + hashlib.sha256(encoded).hexdigest()[:12]
archive = output / ('ottlog-' + release + '.tar.gz')
with tarfile.open(archive, 'w:gz') as bundle:
    for relative, content in [('.ottlog-release-manifest.json', encoded), *files]:
        entry = tarfile.TarInfo(relative)
        entry.size = len(content)
        entry.mode = 0o644
        bundle.addfile(entry, io.BytesIO(content))
record = {'release': release, 'archive': str(archive), 'sha256': hashlib.sha256(archive.read_bytes()).hexdigest(), 'files': len(files), 'bytes': archive.stat().st_size}
(output.parent / 'release.json').write_text(json.dumps(record, indent=2) + '\n', encoding='utf-8')
print(json.dumps(record))
