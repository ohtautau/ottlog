import importlib.util
import pathlib
import sqlite3
import tempfile
from contextlib import closing

spec = importlib.util.spec_from_file_location('backup', pathlib.Path(__file__).with_name('backup.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
with tempfile.TemporaryDirectory() as temp:
    root = pathlib.Path(temp)
    source = root / 'source'
    source.mkdir()
    with closing(sqlite3.connect(source / 'ottlog.db')) as db:
        db.execute('CREATE TABLE sample (value TEXT)')
        db.execute('INSERT INTO sample VALUES (?)', ('persistent article',))
        db.commit()
    (source / 'uploads').mkdir()
    (source / 'uploads' / 'test.png').write_bytes(b'test image')
    archive = module.backup(source, root / 'backups')
    module.restore(archive, root / 'restored')
    with closing(sqlite3.connect(root / 'restored' / 'ottlog.db')) as db:
        assert db.execute('SELECT value FROM sample').fetchone()[0] == 'persistent article'
    assert (root / 'restored' / 'uploads' / 'test.png').read_bytes() == b'test image'
    try: module.restore(archive, root / 'restored')
    except ValueError: pass
    else: raise AssertionError('Must refuse to overwrite existing data')
    print('PASS: database and image roundtrip; existing data protected')
