"""Consistent SQLite snapshot plus uploads and keys. Stop writes for full-file consistency."""
import argparse
import hashlib
import json
import pathlib
import shutil
import sqlite3
import tarfile
import tempfile
from datetime import datetime, timezone
from contextlib import closing


def hashes(root):
    return {str(p.relative_to(root)).replace('\\', '/'): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in root.rglob('*') if p.is_file() and p.name != 'manifest.json'}


def backup(source, destination):
    if not (source / 'ottlog.db').is_file():
        raise ValueError('Source does not contain ottlog.db')
    destination.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as temporary:
        snapshot = pathlib.Path(temporary)
        with closing(sqlite3.connect((source / 'ottlog.db').as_uri() + '?mode=ro', uri=True)) as original:
            with closing(sqlite3.connect(snapshot / 'ottlog.db')) as target:
                original.backup(target)
                if target.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
                    raise ValueError('Database integrity check failed')
        for folder in ['uploads', 'keys']:
            if (source / folder).exists():
                if any(p.is_symlink() for p in (source / folder).rglob('*')):
                    raise ValueError('Symlinks are not supported in backup data')
                shutil.copytree(source / folder, snapshot / folder)
        (snapshot / 'manifest.json').write_text(json.dumps(hashes(snapshot), indent=2), encoding='utf-8')
        archive = destination / ('ottlog-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ') + '.tar.gz')
        with tarfile.open(archive, 'w:gz') as bundle:
            for item in snapshot.iterdir():
                bundle.add(item, arcname=item.name)
        print(archive)
        return archive


def restore(archive, destination):
    if destination.exists() and any(destination.iterdir()):
        raise ValueError('Restore requires an empty target directory; preserve existing data first')
    with tempfile.TemporaryDirectory() as temporary:
        snapshot = pathlib.Path(temporary)
        with tarfile.open(archive, 'r:gz') as bundle:
            for member in bundle.getmembers():
                name = pathlib.PurePosixPath(member.name)
                if name.is_absolute() or '..' in name.parts or member.issym() or member.islnk() or not (member.isfile() or member.isdir()):
                    raise ValueError('Unsafe archive entry')
            bundle.extractall(snapshot, filter='data')
        expected = json.loads((snapshot / 'manifest.json').read_text(encoding='utf-8'))
        if hashes(snapshot) != expected:
            raise ValueError('Backup checksum verification failed')
        with closing(sqlite3.connect(snapshot / 'ottlog.db')) as db:
            if db.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
                raise ValueError('Invalid database')
        destination.mkdir(parents=True, exist_ok=True)
        for item in snapshot.iterdir():
            if item.name != 'manifest.json':
                if item.is_dir(): shutil.copytree(item, destination / item.name)
                else: shutil.copy2(item, destination / item.name)
        print('Restored and verified:', destination)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=pathlib.Path)
    parser.add_argument('destination', type=pathlib.Path)
    parser.add_argument('--restore', action='store_true')
    args = parser.parse_args()
    operation = restore if args.restore else backup
    operation(args.source.resolve(), args.destination.resolve())
