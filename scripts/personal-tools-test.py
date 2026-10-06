"""Exercise account storage against an isolated API and temporary SQLite database.

Build first: dotnet build backend/Ottlog.Api -c PersonalTools
Run: .tools/python/python.exe scripts/personal-tools-test.py
"""

import contextlib
import http.cookiejar
import json
import os
import pathlib
import socket
import sqlite3
import subprocess
import tempfile
import time
import urllib.error
import urllib.request


ROOT = pathlib.Path(__file__).resolve().parents[1]
ASSEMBLY = ROOT / "backend/Ottlog.Api/bin/PersonalTools/net10.0/Ottlog.Api.dll"
PASSWORD = "test-personal-tools-only-123"


class Client:
    def __init__(self, base):
        self.base = base
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())
        )
        self.csrf = None

    def call(self, path, method="GET", payload=None, csrf=True, raw=None):
        headers = {"Content-Type": "application/json"}
        if csrf and self.csrf:
            headers["X-CSRF-TOKEN"] = self.csrf
        body = raw if raw is not None else (
            json.dumps(payload, ensure_ascii=False).encode("utf-8")
            if payload is not None else None
        )
        request = urllib.request.Request(self.base + path, data=body, headers=headers, method=method)
        try:
            response = self.opener.open(request, timeout=10)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            body = response.read()
            try:
                value = json.loads(body) if body else None
            except json.JSONDecodeError:
                value = body.decode("utf-8", errors="replace")
            return response.status, value, response.headers

    def session(self):
        status, data, _ = self.call("/api/account/session")
        assert status == 200
        self.csrf = data["csrfToken"]

    def create(self, name, admin=False):
        self.session()
        path = "/api/auth/setup" if admin else "/api/account/register"
        assert self.call(path, "POST", {"userName": name, "password": PASSWORD})[0] == 200
        self.session()

    def login(self, name):
        self.session()
        assert self.call("/api/account/login", "POST", {"userName": name, "password": PASSWORD})[0] == 200
        self.session()


@contextlib.contextmanager
def server(data_directory):
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        port = probe.getsockname()[1]
    base = f"http://127.0.0.1:{port}"
    environment = dict(os.environ, ASPNETCORE_ENVIRONMENT="Development", DOTNET_ENVIRONMENT="Development")
    environment.pop("ASPNETCORE_HOSTINGSTARTUPASSEMBLIES", None)
    environment.pop("Admin__Password", None)
    environment.pop("Admin__PasswordFile", None)
    with (data_directory / "server.log").open("a", encoding="utf-8") as output:
        process = subprocess.Popen(
            ["dotnet", str(ASSEMBLY), f"--urls={base}", f"--Data:Directory={data_directory}",
             "--SeedExamples=false", "--RateLimits:LoginPerMinute=100"],
            cwd=ROOT / "backend/Ottlog.Api", env=environment, stdout=output, stderr=subprocess.STDOUT,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
        )
        try:
            for _ in range(120):
                if process.poll() is not None:
                    raise AssertionError("Isolated API exited; inspect its server.log")
                try:
                    if Client(base).call("/health")[0] == 200:
                        break
                except urllib.error.URLError:
                    pass
                time.sleep(0.25)
            else:
                raise AssertionError("Isolated API did not start")
            yield base
        finally:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=10)


def run():
    assert ASSEMBLY.exists(), "Build the PersonalTools configuration first"
    results = ROOT / "test-results"
    results.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="personal-tools-", dir=results) as temp:
        data_directory = pathlib.Path(temp)
        with server(data_directory) as base:
            anon = Client(base)
            assert anon.call("/api/personal-tools/meals")[0] == 401
            readers = [Client(base), Client(base)]
            readers[0].create("tools_reader_a")
            readers[1].create("tools_reader_b")
            admin = Client(base)
            admin.create("tools_admin", admin=True)
            for client in [*readers, admin]:
                status, data, headers = client.call("/api/personal-tools/meals")
                assert status == 200 and data == {"data": None}
                assert "no-store" in headers["Cache-Control"]

            meals = {"foods": [{"name": "番茄牛肉面", "tags": ["warm", "noodles"]}], "version": 1}
            reminders = {"items": [{"id": "walk", "title": "走一走"}], "done": {"2026-09-09": ["walk"]}}
            extra_tools = {"todos": {"version": 1, "tasks": [{"id": "task1", "title": "Test task"}]},
                           "pomodoro": {"version": 1, "sessions": [{"id": "focus1", "taskId": "task1"}]},
                           "memos": {"version": 1, "notes": [{"id": "memo1", "body": "memo" * 40000}]}}
            for key, value in [("meals", meals), ("reminders", reminders), *extra_tools.items()]:
                status, data, headers = readers[0].call(f"/api/personal-tools/{key}", "PUT", {"data": value})
                assert status == 200 and data == {"data": value}
                assert "no-store" in headers["Cache-Control"]
                assert readers[0].call(f"/api/personal-tools/{key}")[1] == {"data": value}
                for other in [readers[1], admin]:
                    assert other.call(f"/api/personal-tools/{key}")[1] == {"data": None}

            assert readers[1].call("/api/personal-tools/meals", "PUT", {"data": {"foods": ["rice"]}})[0] == 200
            assert admin.call("/api/personal-tools/meals", "PUT", {"data": {"foods": ["soup"]}})[0] == 200
            assert readers[0].call("/api/personal-tools/meals")[1] == {"data": meals}
            assert readers[0].call("/api/personal-tools/meals", "PUT", {"data": {"blocked": True}}, csrf=False)[0] == 400
            actual_token = readers[0].csrf
            readers[0].csrf = readers[1].csrf
            assert readers[0].call("/api/personal-tools/meals", "PUT", {"data": {"blocked": True}})[0] == 400
            readers[0].csrf = actual_token
            assert readers[0].call("/api/personal-tools/meals")[1] == {"data": meals}
            assert readers[0].call("/api/personal-tools/settings")[0] == 404
            assert readers[0].call("/api/personal-tools/settings", "PUT", {"data": {}})[0] == 404
            assert readers[0].call("/api/personal-tools/meals", "PUT", {})[0] == 400
            assert readers[0].call("/api/personal-tools/meals", "PUT", raw=b'{"data":invalid}')[0] == 400
            assert readers[0].call("/api/personal-tools/meals", "PUT", {"data": "a" * (128 * 1024)})[0] == 400
            too_large = readers[0].call("/api/personal-tools/meals", "PUT", {"data": "a" * (129 * 1024)})
            assert too_large[0] in (400, 413), too_large[:2]
            assert readers[0].call("/api/personal-tools/meals", "PUT", {"data": meals})[0] == 200
            # Habit backgrounds now share the 1 MB limit used by the other workspaces.
            assert readers[0].call("/api/personal-tools/reminders", "PUT", {"data": "a" * (160 * 1024)})[0] == 200
            assert readers[0].call("/api/personal-tools/reminders", "PUT", {"data": "a" * (1024 * 1024)})[0] == 400
            assert readers[0].call("/api/personal-tools/reminders", "PUT", {"data": reminders})[0] == 200
            assert readers[0].call("/api/personal-tools/memos", "PUT", {"data": "a" * (1024 * 1024)})[0] == 400
            assert readers[0].call("/api/personal-tools/memos")[1] == {"data": extra_tools["memos"]}
            for key in extra_tools:
                assert readers[0].call(f"/api/personal-tools/{key}", "PUT", {"data": {}}, csrf=False)[0] == 400
            print("PASS: authentication, account/tool isolation, CSRF, bounds, invalid JSON, no-store, idempotent saves")

        with contextlib.closing(sqlite3.connect(data_directory / "ottlog.db")) as database:
            assert database.execute("SELECT COUNT(*) FROM PersonalToolStates").fetchone()[0] == 7
            assert database.execute("SELECT COUNT(*) FROM Readers").fetchone()[0] == 2
        with server(data_directory) as base:
            reader = Client(base)
            reader.login("tools_reader_a")
            assert reader.call("/api/personal-tools/meals")[1] == {"data": meals}
            assert reader.call("/api/personal-tools/reminders")[1] == {"data": reminders}
            for key, value in extra_tools.items():
                assert reader.call(f"/api/personal-tools/{key}")[1] == {"data": value}
            print("PASS: stored data survives API restart and fresh sign-in")

        # Recreate the pre-change schema in this temporary DB, retaining its existing users and settings.
        with contextlib.closing(sqlite3.connect(data_directory / "ottlog.db")) as database:
            database.execute("DROP TABLE PersonalToolStates")
            database.execute("DELETE FROM __EFMigrationsHistory WHERE MigrationId LIKE '%_PersonalToolState'")
            database.execute("INSERT INTO Settings (Key, Value) VALUES ('migration-preservation-check', 'retained')")
            database.commit()
        with server(data_directory) as base:
            reader = Client(base)
            reader.login("tools_reader_a")
            assert reader.call("/api/personal-tools/meals")[1] == {"data": None}
            assert reader.call("/api/personal-tools/meals", "PUT", {"data": meals})[0] == 200
        with contextlib.closing(sqlite3.connect(data_directory / "ottlog.db")) as database:
            assert database.execute("SELECT Value FROM Settings WHERE Key = 'migration-preservation-check'").fetchone()[0] == "retained"
            assert database.execute("SELECT COUNT(*) FROM Readers").fetchone()[0] == 2
        print("PASS: migration upgrades an existing database without resetting accounts or settings")


if __name__ == "__main__":
    run()
