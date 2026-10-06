import importlib.util
import contextlib
import json
import pathlib
import sqlite3
import tempfile

spec = importlib.util.spec_from_file_location("exporter", pathlib.Path(__file__).with_name("export-supabase-tools.py"))
exporter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exporter)
with tempfile.TemporaryDirectory(prefix="ottlog-export-test-") as directory:
    database = pathlib.Path(directory) / "synthetic.db"
    output = pathlib.Path(directory) / "synthetic.sql"
    with contextlib.closing(sqlite3.connect(database)) as connection:
        connection.execute("CREATE TABLE PersonalToolStates (Owner TEXT, Key TEXT, DataJson TEXT, UpdatedAt TEXT)")
        connection.execute("INSERT INTO PersonalToolStates VALUES (?, ?, ?, ?)", ("reader:test", "growth", json.dumps({"id": "stable-id", "note": "成长🙂 O'Hara\\n"}, ensure_ascii=False), "2026-10-06T00:00:00+00:00"))
        connection.commit()
    original = database.read_bytes()
    assert exporter.export(database) == (1, 1) and not output.exists()
    assert exporter.export(database, output) == (1, 1)
    text = output.read_text(encoding="utf-8")
    assert "stable-id" in text and "成长🙂" in text and "O''Hara" in text and "ON CONFLICT" not in text
    assert text.startswith("BEGIN;") and text.endswith("COMMIT;\n")
    assert database.read_bytes() == original
    try:
        exporter.export(database, output)
        raise AssertionError("Overwrote export")
    except FileExistsError:
        pass
    with contextlib.closing(sqlite3.connect(database)) as connection:
        connection.execute("UPDATE PersonalToolStates SET Owner = 'guest'")
        connection.commit()
    try:
        exporter.export(database, pathlib.Path(directory) / "invalid.sql")
        raise AssertionError("Accepted guest")
    except ValueError:
        pass
    assert not (pathlib.Path(directory) / "invalid.sql").exists()
print("PASS: dry run, read-only source, original ID/Unicode/SQL quoting, no overwrite, guest rejection; synthetic database only.")
