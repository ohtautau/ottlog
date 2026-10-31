"""Exercises destructive reset only against a temporary database."""
import importlib.util
import json
import sqlite3
import tempfile
from pathlib import Path
from contextlib import closing
from backup import restore

spec = importlib.util.spec_from_file_location('reset_project_data', Path(__file__).with_name('reset-project-data.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

with tempfile.TemporaryDirectory() as folder:
    root = Path(folder)
    source = root / 'data'
    source.mkdir()
    database = source / 'ottlog.db'
    tables = ('WeChatReminders', 'WeChatPomodoroReminders', 'WeChatBindings', 'Comments',
              'Favorites', 'Articles', 'Readers', 'Administrators')
    with closing(sqlite3.connect(database)) as db, db:
        for table in tables:
            db.execute(f'CREATE TABLE "{table}" (Id INTEGER PRIMARY KEY)')
            db.execute(f'INSERT INTO "{table}" VALUES (1)')
        db.execute('CREATE TABLE PersonalToolStates (Owner TEXT, Key TEXT, DataJson TEXT, UpdatedAt TEXT)')
        for owner in ('guest', 'reader:retained-user'):
            for key in ('reminders', 'mottos', 'todos', 'domains', 'memos', 'pomodoro', 'growth', 'meals', 'dining'):
                db.execute('INSERT INTO PersonalToolStates VALUES (?,?,?,?)', (owner, key, json.dumps({'original': key}), 'original-time'))
        db.execute('CREATE TABLE Settings (Key TEXT PRIMARY KEY, Value TEXT)')
        db.executemany('INSERT INTO Settings VALUES (?,?)', [('homepage-mottos', '["保留的格言"]'), ('seed-complete', '1'), ('other', 'remove')])
    module.reset(database, root / 'backups')
    with closing(sqlite3.connect(database)) as db:
        for table in tables:
            assert db.execute(f'SELECT count(*) FROM "{table}"').fetchone()[0] == 0
        kept = db.execute('SELECT Owner, Key, DataJson, UpdatedAt FROM PersonalToolStates').fetchall()
        assert len(kept) == 4
        assert all(key in ('reminders', 'mottos') and json.loads(data) == {'original': key} and time == 'original-time' for _, key, data, time in kept)
        assert db.execute("SELECT Value FROM Settings WHERE Key='homepage-mottos'").fetchone()[0] == '["保留的格言"]'
        assert db.execute("SELECT Value FROM Settings WHERE Key='seed-complete'").fetchone()[0] == '1'
    assert len(list((root / 'backups').glob('*.tar.gz'))) == 1
    restored = root / 'restored'
    restore(next((root / 'backups').glob('*.tar.gz')), restored)
    with closing(sqlite3.connect(restored / 'ottlog.db')) as db:
        assert db.execute('SELECT count(*) FROM Articles').fetchone()[0] == 1
        assert db.execute('SELECT count(*) FROM PersonalToolStates').fetchone()[0] == 18
print('PASS isolated reset: all requested records removed, habits/mottos unchanged for each owner, verified backup restores original data.')
