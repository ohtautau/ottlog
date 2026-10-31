"""Build an API-only overlay, verify migration on a backup, then replace only API.

Run with sudo; --context contains only Ottlog.Api.dll/pdb and Dockerfile.
All databases, keys, overrides and backups stay on the private server.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import sqlite3
import subprocess
import tempfile
import time
import urllib.request
from datetime import datetime, timezone


def docker(*args, capture=False):
    return subprocess.check_output(['docker', *args], text=True) if capture else subprocess.run(['docker', *args], check=True)


def backup(source, target):
    with sqlite3.connect(source) as live, sqlite3.connect(target) as copy:
        live.backup(copy)
    target.chmod(0o600)


def hashes(path):
    with sqlite3.connect(path) as db:
        names = [r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")
                 if not r[0].startswith(('sqlite_', '__EF')) and r[0] != 'BotGrants']
        return {name: hashlib.sha256(json.dumps(sorted(db.execute('SELECT * FROM "' + name.replace('"', '""') + '"').fetchall(), key=repr),
            ensure_ascii=False, default=str).encode()).hexdigest() for name in names}


def healthy(base):
    for _ in range(30):
        try:
            with urllib.request.urlopen(base + '/health/ready', timeout=2) as response:
                if response.status == 200:
                    return True
        except Exception:
            pass
        time.sleep(1)
    return False


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--context', type=Path, required=True)
    parser.add_argument('--image', required=True)
    args = parser.parse_args()
    os.umask(0o077)
    root, context = args.root.resolve(), args.context.resolve()
    if not re.fullmatch(r'ottlog-api:bot-auth-[a-zA-Z0-9.-]+', args.image):
        raise RuntimeError('Unexpected image tag')
    if {p.name for p in context.iterdir()} != {'Ottlog.Api.dll', 'Ottlog.Api.pdb', 'Dockerfile'}:
        raise RuntimeError('Overlay must contain only the compiled API and Dockerfile')
    container = json.loads(docker('inspect', 'ottlog-api-1', capture=True))[0]
    old_image = container['Config']['Image']
    labels = container['Config']['Labels']
    if labels['com.docker.compose.project'] != 'ottlog':
        raise RuntimeError('Unexpected Compose project')
    files = [Path(f).resolve() for f in labels['com.docker.compose.project.config_files'].split(',')]
    if any(not p.is_relative_to(root) for p in files):
        raise RuntimeError('Compose file outside deployment root')
    mount = next(m for m in container['Mounts'] if m.get('Name') == 'ottlog_blog_data')
    data = Path(mount['Source'])
    if not (data / 'ottlog.db').is_file():
        raise RuntimeError('Live database missing')
    docker('build', '--pull=false', '--build-arg', 'BASE_IMAGE=' + old_image, '-t', args.image, str(context))
    (root / 'migration').mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='bot-auth-check-', dir=root / 'migration') as folder:
        temporary = Path(folder)
        backup(data / 'ottlog.db', temporary / 'ottlog.db')
        if (data / 'keys').exists():
            shutil.copytree(data / 'keys', temporary / 'keys')
        before = hashes(temporary / 'ottlog.db')
        name = 'ottlog-bot-auth-check-' + temporary.name.rsplit('-', 1)[-1]
        try:
            docker('run', '-d', '--name', name, '--user', '0:0', '-p', '127.0.0.1::8080',
                '-e', 'ASPNETCORE_ENVIRONMENT=Production', '-v', str(temporary) + ':/bot-check', args.image,
                '--urls=http://+:8080', '--Data:Directory=/bot-check', '--SeedExamples=false')
            port = docker('port', name, '8080/tcp', capture=True).strip().rsplit(':', 1)[1]
            if not healthy('http://127.0.0.1:' + port):
                raise RuntimeError('Backup migration health check failed')
            if hashes(temporary / 'ottlog.db') != before:
                raise RuntimeError('Backup migration changed existing business records')
            with sqlite3.connect(temporary / 'ottlog.db') as db:
                assert db.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
                assert db.execute("SELECT COUNT(*) FROM __EFMigrationsHistory WHERE MigrationId='20261031090000_AddBotGrants'").fetchone()[0] == 1
                assert db.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='BotGrants'").fetchone()[0] == 1
            print('PASS: production backup migration, SQLite integrity, all existing business row hashes unchanged.', flush=True)
        finally:
            docker('rm', '-f', name)
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    backups = root / 'backups'
    backups.mkdir(exist_ok=True, mode=0o700)
    backup(data / 'ottlog.db', backups / ('before-bot-authorization-' + stamp + '.db'))
    override = root / 'shared/bot-authorization.override.yml'
    previous = override.read_text() if override.exists() else None
    override.write_text('services:\n  api:\n    image: ' + args.image + '\n')
    override.chmod(0o600)
    compose = ['docker', 'compose', '-p', 'ottlog', '--env-file', str(root / 'shared/deploy.env')]
    for file in [f for f in files if f != override] + [override]:
        compose.extend(['-f', str(file)])
    def rollback():
        override.write_text(previous if previous is not None else 'services:\n  api:\n    image: ' + old_image + '\n')
        subprocess.run([*compose, 'up', '-d', '--no-deps', 'api'], check=True)
    try:
        subprocess.run([*compose, 'up', '-d', '--no-deps', 'api'], check=True)
        if not healthy('http://127.0.0.1:8088'):
            raise RuntimeError('Live API health check failed')
    except Exception:
        rollback()
        raise
    (root / 'migration/bot-authorization.json').write_text(json.dumps({
        'image': args.image, 'previousImage': old_image, 'override': str(override), 'deployedAt': stamp,
        'assemblySha256': hashlib.sha256((context / 'Ottlog.Api.dll').read_bytes()).hexdigest()
    }, indent=2))
    print('PASS: API-only deployment; original web/proxy/volumes retained. Previous API image and backup retained.')


if __name__ == '__main__':
    main()
