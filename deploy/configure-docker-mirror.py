"""Use Tencent's documented internal Docker Hub mirror on this Tencent host."""
import json
import pathlib
import shutil

config_path = pathlib.Path('/etc/docker/daemon.json')
config = json.loads(config_path.read_text()) if config_path.exists() else {}
backup = config_path.with_suffix('.json.before-ottlog')
if config_path.exists() and not backup.exists():
    shutil.copy2(config_path, backup)
config['registry-mirrors'] = ['https://mirror.ccs.tencentyun.com']
config.setdefault('log-driver', 'json-file')
config.setdefault('log-opts', {'max-size': '10m', 'max-file': '3'})
config_path.write_text(json.dumps(config, indent=2) + '\n')
