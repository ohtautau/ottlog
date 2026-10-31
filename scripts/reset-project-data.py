"""Explicit, offline operator reset. Preserves habits/mottos and creates a backup first.

Not imported by the application; never run automatically during startup or deployment.
"""
import argparse
import json
import sqlite3
from contextlib import closing
from pathlib import Path

from backup import backup


def reset(database: Path, destination: Path):
    if not database.is_file():
        raise ValueError('Database does not exist')
    archive = backup(database.parent, destination)
    with closing(sqlite3.connect(database)) as connection, connection:
        connection.execute('PRAGMA foreign_keys=ON')
        preserved = connection.execute(
            "SELECT Owner, Key, DataJson, UpdatedAt FROM PersonalToolStates WHERE Key IN ('reminders', 'mottos') ORDER BY Owner, Key"
        ).fetchall()
        mottos = connection.execute("SELECT Value FROM Settings WHERE Key='homepage-mottos'").fetchall()
        before = {}
        # Dependents first; keep the schema and migration history.
        for table in ('WeChatReminders', 'WeChatPomodoroReminders', 'WeChatBindings',
                      'Comments', 'Favorites', 'Articles', 'Readers', 'Administrators'):
            before[table] = connection.execute(f'SELECT count(*) FROM "{table}"').fetchone()[0]
            connection.execute(f'DELETE FROM "{table}"')
        connection.execute("DELETE FROM PersonalToolStates WHERE Key NOT IN ('reminders', 'mottos')")
        connection.execute("DELETE FROM Settings WHERE Key NOT IN ('homepage-mottos', 'seed-complete')")
        connection.execute("INSERT OR REPLACE INTO Settings (Key, Value) VALUES ('seed-complete', '1')")
        after = connection.execute(
            "SELECT Owner, Key, DataJson, UpdatedAt FROM PersonalToolStates WHERE Key IN ('reminders', 'mottos') ORDER BY Owner, Key"
        ).fetchall()
        if after != preserved or connection.execute("SELECT Value FROM Settings WHERE Key='homepage-mottos'").fetchall() != mottos:
            raise ValueError('Preserved data changed; rolling back')
        if connection.execute('PRAGMA integrity_check').fetchone()[0] != 'ok' or connection.execute('PRAGMA foreign_key_check').fetchall():
            raise ValueError('Database verification failed; rolling back')
    print(json.dumps({'backup': str(archive), 'removed': before, 'preservedToolRows': len(preserved), 'preservedHomepageMottos': len(mottos)}, ensure_ascii=False))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database', required=True, type=Path)
    parser.add_argument('--backups', required=True, type=Path)
    parser.add_argument('--apply', required=True, action='store_true', help='Explicitly authorize the offline reset')
    args = parser.parse_args()
    reset(args.database.resolve(), args.backups.resolve())
