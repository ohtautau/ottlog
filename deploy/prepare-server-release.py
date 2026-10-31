"""Verify an uploaded source archive and prepare private, reusable host settings."""
import argparse
import hashlib
import json
import os
import pathlib
import re
import secrets
import tarfile

parser = argparse.ArgumentParser()
parser.add_argument('archive', type=pathlib.Path)
parser.add_argument('sha256')
parser.add_argument('release')
parser.add_argument('--root', type=pathlib.Path, default=pathlib.Path.home() / 'ottlog')
parser.add_argument('--source-only', action='store_true', help='Only verify and extract sources; preserve all host settings and release environment')
args = parser.parse_args()
if not re.fullmatch(r'\d{8}T\d{6}Z-[0-9a-f]{12}', args.release):
    raise ValueError('Invalid release name')
if hashlib.sha256(args.archive.read_bytes()).hexdigest() != args.sha256:
    raise ValueError('Uploaded source checksum does not match')
root = args.root.resolve()
root.mkdir(mode=0o700, parents=True, exist_ok=True)
target = root / 'releases' / args.release
if target.exists() and any(target.iterdir()):
    raise ValueError('Release directory already exists; do not overwrite releases')
target.mkdir(mode=0o700, parents=True, exist_ok=True)
with tarfile.open(args.archive, 'r:gz') as archive:
    for member in archive.getmembers():
        name = pathlib.PurePosixPath(member.name)
        if name.is_absolute() or '..' in name.parts or not member.isfile():
            raise ValueError('Unsafe source archive entry')
    archive.extractall(target, filter='data')
manifest = json.loads((target / '.ottlog-release-manifest.json').read_text())
for relative, expected in manifest.items():
    source = target / relative
    if not source.resolve().is_relative_to(target) or hashlib.sha256(source.read_bytes()).hexdigest() != expected:
        raise ValueError('Runtime source verification failed: ' + relative)
if args.source_only:
    print(json.dumps({'release': args.release, 'verified_files': len(manifest), 'source': str(target), 'host_settings_changed': False}))
    raise SystemExit(0)
shared = root / 'shared'
shared.mkdir(mode=0o700, exist_ok=True)
(root / 'backups').mkdir(mode=0o700, exist_ok=True)
password = shared / 'admin-password.txt'
if not password.exists():
    password.write_text(secrets.token_urlsafe(36) + '\n')
password.chmod(0o640)
env_file = shared / 'deploy.env'
settings = env_file.read_text().splitlines() if env_file.exists() else []
controlled = {'OTTLOG_SHARED_DIRECTORY', 'OTTLOG_ADMIN_PASSWORD_FILE', 'OTTLOG_BACKUP_DIRECTORY', 'OTTLOG_RELEASE_ID', 'OTTLOG_SECRET_GID'}
settings = [line for line in settings if line.partition('=')[0] not in controlled]
settings += [f'OTTLOG_SHARED_DIRECTORY={shared}', f'OTTLOG_ADMIN_PASSWORD_FILE={password}', f'OTTLOG_BACKUP_DIRECTORY={root / "backups"}', f'OTTLOG_RELEASE_ID={args.release}', f'OTTLOG_SECRET_GID={os.getgid()}']
env_file.write_text('\n'.join(settings) + '\n')
env_file.chmod(0o600)
print(json.dumps({'release': args.release, 'verified_files': len(manifest), 'source': str(target), 'shared': str(shared)}))
