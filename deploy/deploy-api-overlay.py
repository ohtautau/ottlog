#!/usr/bin/env python3
"""Deploy a verified assembly overlay while retaining the running API's settings."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import time
import urllib.request


def docker(*args, env=None):
    prefix = ["sudo", "-n"]
    if env:
        prefix += ["env", "OTTLOG_API_HOST=" + env["OTTLOG_API_HOST"],
                   "OTTLOG_API_EDGE_DIRECTORY=" + env["OTTLOG_API_EDGE_DIRECTORY"]]
    return subprocess.run([*prefix, "docker", *args], check=True, capture_output=True, text=True).stdout.strip()


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("stage", type=Path)
    p.add_argument("image")
    p.add_argument("expected_base_id")
    p.add_argument("--root", type=Path, default=Path.home() / "ottlog")
    a = p.parse_args()
    root = a.root.resolve(strict=True)
    stage = a.stage.resolve(strict=True)
    if not stage.is_relative_to(root / "shared") or not re.fullmatch(r"ottlog-api:[a-z0-9-]+", a.image):
        raise RuntimeError("Unexpected overlay location/image")
    manifest = json.loads((stage / "manifest.json").read_text())
    if set(manifest) != {"Ottlog.Api.dll", "Ottlog.Api.pdb", "Dockerfile"}:
        raise RuntimeError("Overlay must contain only the assembly, symbols and Dockerfile")
    for name, expected in manifest.items():
        if (stage / name).is_symlink() or hashlib.sha256((stage / name).read_bytes()).hexdigest() != expected:
            raise RuntimeError("Overlay verification failed: " + name)
    api = json.loads(docker("inspect", "ottlog-api-1"))[0]
    proxy = json.loads(docker("inspect", "ottlog-proxy-1"))[0]
    if api["Image"] != a.expected_base_id:
        raise RuntimeError("Running API changed; rebase overlay before deployment")
    docker("build", "--pull=false", "--build-arg", "BASE_IMAGE=" + api["Config"]["Image"], "-t", a.image, str(stage))
    labels = proxy["Config"]["Labels"]
    files = [Path(value).resolve(strict=True) for value in labels["com.docker.compose.project.config_files"].split(",")]
    if any(not f.is_relative_to(root) for f in files):
        raise RuntimeError("Unexpected Compose path")
    edge = next(f.parent for f in reversed(files) if f.name == "compose.api-private-web.yml")
    env = {"OTTLOG_API_HOST": "api.ohtautau.com", "OTTLOG_API_EDGE_DIRECTORY": str(edge)}
    old = ["compose", "--env-file", labels["com.docker.compose.project.environment_file"]]
    for f in files:
        old.extend(["-f", str(f)])
    override = stage / "compose.api.yml"
    override.write_text(json.dumps({"services": {"api": {"image": a.image, "pull_policy": "never"}}}, indent=2))
    new = [*old, "-f", str(override)]
    docker(*new, "config", "--quiet", env=env)
    backup = root / "backups" / ("before-remember-login-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ"))
    backup.mkdir(mode=0o700)
    (backup / "api-before.json").write_text(json.dumps({"image": api["Config"]["Image"], "imageId": api["Image"], "composeFiles": [str(f) for f in files]}, indent=2))
    (backup / "api-before.json").chmod(0o600)
    data = next(m for m in api["Mounts"] if m["Destination"] == "/data" and m["Type"] == "volume")
    script = "import sqlite3,sys,os; src=sqlite3.connect('file:'+sys.argv[1]+'?mode=ro',uri=True); dst=sqlite3.connect(sys.argv[2]); src.backup(dst); assert dst.execute('PRAGMA integrity_check').fetchone()[0]=='ok'; dst.close(); src.close(); os.chmod(sys.argv[2],0o600)"
    subprocess.run(["sudo", "-n", "python3", "-c", script, data["Source"] + "/ottlog.db", str(backup / "ottlog.db")], check=True)
    if json.loads(docker("inspect", "ottlog-api-1"))[0]["Image"] != a.expected_base_id:
        raise RuntimeError("API changed during build; no services switched")
    try:
        docker(*new, "up", "-d", "--no-deps", "api", env=env)
        for i in range(40):
            try:
                with urllib.request.urlopen("http://127.0.0.1:8088/health/ready", timeout=3) as r:
                    if r.status == 200:
                        break
            except OSError:
                pass
            if i == 39:
                raise RuntimeError("Updated API not ready")
            time.sleep(1)
    except Exception:
        docker(*old, "up", "-d", "--no-deps", "api", env=env)
        raise
    print(json.dumps({"image": a.image, "backup": str(backup), "base": api["Config"]["Image"], "webAndProxyChanged": False, "databaseMigratedByThisScript": False}))


if __name__ == "__main__":
    main()
