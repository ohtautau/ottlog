"""Isolated preview/check runner: never binds the user's 3000/5229 ports.

Build API first with `dotnet build backend/Ottlog.Api -c PersonalTools`.
Run with --check to execute the productivity regression suites and stop both servers.
Without --check, write the printed stop-file to shut down the temporary preview.
"""
import importlib.util
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "web"
RESULTS = WEB / "test-results"
DIST = "test-results/.next-productivity"
spec = importlib.util.spec_from_file_location("tooltest", ROOT / "scripts/personal-tools-test.py")
tooltest = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tooltest)


def main():
    RESULTS.mkdir(exist_ok=True)
    fixture = RESULTS / f"productivity-{uuid4().hex[:10]}"
    fixture.mkdir()
    stop = fixture / "stop"
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        port = probe.getsockname()[1]
    origin = f"http://127.0.0.1:{port}"
    node = shutil.which("node")
    next_env_path = WEB / "next-env.d.ts"
    original_next_env = next_env_path.read_bytes() if next_env_path.exists() else None
    with tooltest.server(fixture) as api, (fixture / "web.log").open("w", encoding="utf-8") as output:
        environment = dict(os.environ, API_BASE_URL=api, OTTLOG_NEXT_DIST_DIR=DIST)
        environment.pop("NODE_ENV", None)
        process = subprocess.Popen([node, "node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", str(port)],
            cwd=WEB, env=environment, stdout=output, stderr=subprocess.STDOUT,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
        try:
            for _ in range(160):
                if process.poll() is not None:
                    raise RuntimeError(f"Preview exited. Inspect {fixture / 'web.log'}")
                try:
                    with urllib.request.urlopen(origin + "/api/account/profile", timeout=2) as response:
                        if response.status == 200:
                            break
                except (urllib.error.URLError, TimeoutError):
                    time.sleep(.25)
            else:
                raise RuntimeError("Preview did not start")
            info = {"origin": origin, "api": api, "fixture": str(fixture), "stop": str(stop), "pid": process.pid}
            (RESULTS / "productivity-runtime.json").write_text(json.dumps(info), encoding="utf-8")
            print(json.dumps(info), flush=True)
            if "--check" in sys.argv:
                for script in ["check-todos.cjs", "check-productivity.cjs", "check-memo-transitions.cjs", "check-tool-cache-races.cjs", "check-daily-tools.cjs", "check-tool-backups.cjs", "check-quick-note.cjs"]:
                    if not (WEB / "scripts" / script).exists():
                        continue
                    result = subprocess.run([node, f"scripts/{script}"], cwd=WEB, env=dict(os.environ, TEST_ORIGIN=origin))
                    if result.returncode:
                        raise SystemExit(result.returncode)
            else:
                while not stop.exists():
                    if process.poll() is not None:
                        raise RuntimeError("Preview unexpectedly stopped")
                    time.sleep(.3)
        finally:
            if os.name == "nt" and process.poll() is None:
                subprocess.run(["taskkill", "/PID", str(process.pid), "/T", "/F"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            elif process.poll() is None:
                process.terminate()
            process.wait(timeout=15)
            # Next adds generated types for custom dist folders. Keep the user's default config clean.
            config_path = WEB / "tsconfig.json"
            config = json.loads(config_path.read_text(encoding="utf-8-sig"))
            includes = config.get("include", [])
            cleaned = [item for item in includes if not item.startswith(DIST + "/")]
            if includes != cleaned:
                config["include"] = cleaned
                config_path.write_text(json.dumps(config, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            if original_next_env is not None and next_env_path.exists() and DIST in next_env_path.read_text(encoding="utf-8"):
                next_env_path.write_bytes(original_next_env)
            print("Isolated preview stopped; no development ports were changed.", flush=True)


if __name__ == "__main__":
    main()
