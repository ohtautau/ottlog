"""Read-only export of Ottlog tool snapshots. Never connects to the cloud.

Default: validate and report counts only. --output writes new INSERT-only SQL.
Use a consistent backed-up SQLite database; keep the original account database.
"""
import argparse
import contextlib
import json
import pathlib
import re
import sqlite3

KEYS = {"meals", "reminders", "todos", "pomodoro", "memos", "dining", "mottos", "growth", "domains"}


def export(database, output=None):
    with contextlib.closing(sqlite3.connect(pathlib.Path(database).resolve().as_uri() + "?mode=ro", uri=True)) as connection:
        rows = connection.execute("SELECT Owner, Key, DataJson, UpdatedAt FROM PersonalToolStates ORDER BY Owner, Key").fetchall()
    statements = []
    identities = set()
    for owner, key, data, updated in rows:
        if not re.fullmatch(r"(admin|reader):[A-Za-z0-9_-]{1,80}", owner) or key not in KEYS or (owner, key) in identities:
            raise ValueError("Invalid or duplicate tool identity; export cancelled")
        identities.add((owner, key))
        json.loads(data)
        if len(data.encode("utf-8")) > (128 * 1024 if key == "meals" else 1024 * 1024):
            raise ValueError("Tool payload exceeds capacity; export cancelled")
        values = ["'" + value.replace("'", "''") + "'" for value in (owner, key, data, updated)]
        statements.append("INSERT INTO public.personal_tool_states (owner, key, data, updated_at) VALUES (" + ", ".join(values[:2]) + ", " + values[2] + "::jsonb, " + values[3] + "::timestamptz);")
    if output:
        # Exclusive create; never overwrite a backup. A duplicate target row aborts
        # the whole SQL transaction instead of silently replacing cloud data.
        with pathlib.Path(output).open("x", encoding="utf-8") as target:
            target.write("BEGIN;\nSET LOCAL standard_conforming_strings = on;\n" + "\n".join(statements) + "\nCOMMIT;\n")
    return len(rows), len({row[0] for row in rows})


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("database", type=pathlib.Path)
    parser.add_argument("--output", type=pathlib.Path)
    arguments = parser.parse_args()
    try:
        records, accounts = export(arguments.database, arguments.output)
        print(f"Validated {records} snapshots across {accounts} accounts. " + ("SQL export written; no cloud changes." if arguments.output else "Dry run only; no files or cloud data changed."))
    except (ValueError, sqlite3.Error, OSError):
        raise SystemExit("Export failed. Check source format, permissions, capacity and output path; no cloud data changed.")
