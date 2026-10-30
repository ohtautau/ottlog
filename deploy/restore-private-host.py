"""Restore a checksummed Ottlog runtime onto an empty host; never overwrite data."""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import pwd
import sqlite3
import subprocess
import tarfile


def run(*args, **kwargs):
    return subprocess.run(args, check=True, **kwargs)


def verify(path, digest):
    actual = hashlib.file_digest(Path(path).open('rb'), 'sha256').hexdigest()
    if actual != digest:
        raise ValueError('Archive checksum mismatch')


def safe_members(archive, allowed):
    members = archive.getmembers()
    for member in members:
        path = PurePosixPath(member.name)
        if path.is_absolute() or '..' in path.parts or not (member.isfile() or member.isdir()) or not any(path == p or p in path.parents for p in allowed):
            raise ValueError('Archive has an unsafe member')
    return members


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--runtime', type=Path, required=True)
    parser.add_argument('--runtime-sha', required=True)
    parser.add_argument('--images', type=Path, required=True)
    parser.add_argument('--images-sha', required=True)
    parser.add_argument('--state', type=Path, required=True)
    parser.add_argument('--snapshot', type=Path)
    parser.add_argument('--snapshot-sha')
    parser.add_argument('--prepare-only', action='store_true')
    parser.add_argument('--owner', default='ubuntu')
    args = parser.parse_args()
    root = args.root.resolve()
    if root == Path('/') or len(root.parts) < 4:
        raise ValueError('Unsafe installation root')
    state = json.loads(args.state.read_text())
    for name in state['composeFiles']:
        path = PurePosixPath(name)
        if path.is_absolute() or '..' in path.parts:
            raise ValueError('Unsafe Compose path')
    marker = root / 'migration/prepared.json'
    if not marker.exists():
        verify(args.runtime, args.runtime_sha)
        verify(args.images, args.images_sha)
        if any((root / name).exists() for name in ['shared', 'releases', 'current']):
            raise ValueError('Refusing to overwrite an existing runtime')
        with tarfile.open(args.runtime) as archive:
            members = safe_members(archive, [PurePosixPath('shared'), PurePosixPath('releases')])
            archive.extractall(root, members=members, filter='data')
        identity = pwd.getpwnam(args.owner)
        for folder in ['shared', 'releases']:
            for path in [root / folder, *(root / folder).rglob('*')]:
                os.chown(path, identity.pw_uid, identity.pw_gid)
        (root / 'shared').chmod(0o700)
        for path in (root / 'shared').iterdir():
            if path.is_file() and path.suffix in ['.env', '.txt', '.yml']:
                path.chmod(0o640 if path.name == 'admin-password.txt' else 0o600)
        run('docker', 'load', '-i', str(args.images))
        marker.write_text(json.dumps({'runtimeSha': args.runtime_sha, 'imagesSha': args.images_sha}))
    else:
        prepared = json.loads(marker.read_text())
        if prepared != {'runtimeSha': args.runtime_sha, 'imagesSha': args.images_sha}:
            raise ValueError('Different runtime already prepared')
    for name, image in state['images'].items():
        actual = subprocess.check_output(['docker', 'image', 'inspect', image, '--format', '{{.Id}}'], text=True).strip()
        if actual != state['imageIds'][name]:
            raise ValueError('Loaded image ID differs from source')
    command = ['docker', 'compose', '--env-file', str(root / 'shared/deploy.env')]
    for path in state['composeFiles']:
        command += ['-f', str(root / path)]
    run(*command, 'config', '--quiet')
    if args.prepare_only:
        print('Runtime and image IDs verified; waiting for final snapshot.')
        return
    if not args.snapshot or not args.snapshot_sha:
        raise ValueError('Final snapshot and checksum are required')
    verify(args.snapshot, args.snapshot_sha)
    volume_root = Path(subprocess.check_output(['docker', 'info', '--format', '{{.DockerRootDir}}'], text=True).strip()) / 'volumes'
    allowed = []
    for name in state['volumes']:
        if name not in ['ottlog_blog_data', 'ottlog_caddy_data', 'ottlog_caddy_config']:
            raise ValueError('Unexpected source volume')
        run('docker', 'volume', 'create', name, stdout=subprocess.DEVNULL)
        target = volume_root / name / '_data'
        if any(target.iterdir()):
            raise ValueError('Target volume is not empty; data was not overwritten')
        allowed.append(PurePosixPath(name) / '_data')
    with tarfile.open(args.snapshot) as archive:
        members = safe_members(archive, allowed)
        archive.extractall(volume_root, members=members, filter='data')
        for member in members:
            path = volume_root / member.name
            os.chown(path, member.uid, member.gid)
            if member.isdir():
                os.chmod(path, member.mode & 0o777)
    database = volume_root / 'ottlog_blog_data/_data/ottlog.db'
    with sqlite3.connect(database.as_uri() + '?mode=ro', uri=True) as db:
        if db.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
            raise ValueError('Restored database integrity check failed')
        tables = [row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")]
        counts = {table: db.execute('SELECT count(*) FROM "' + table.replace('"', '""') + '"').fetchone()[0] for table in tables}
    run(*command, 'up', '-d', '--no-build', 'api', 'web', 'proxy')
    release = (root / state['composeFiles'][0]).parent.parent
    if (root / 'current').exists() or (root / 'current').is_symlink():
        raise ValueError('Current link unexpectedly exists')
    (root / 'current').symlink_to(release, target_is_directory=True)
    (root / 'backups').mkdir(exist_ok=True)
    (root / 'migration/restored.json').write_text(json.dumps({'snapshotSha': args.snapshot_sha, 'counts': counts}, indent=2))
    print('Restored all volumes; SQLite integrity and source image IDs verified.')


if __name__ == '__main__':
    main()
