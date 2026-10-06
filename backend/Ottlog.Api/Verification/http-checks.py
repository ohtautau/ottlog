"""Verify reminder HTTP authorization/CSRF on an isolated API with no WeChat credentials.

dotnet build backend/Ottlog.Api -c ReminderChecks
.tools/python/python.exe backend/Ottlog.Api/Verification/http-checks.py
"""
import importlib.util
import pathlib
import tempfile

root = pathlib.Path(__file__).resolve().parents[3]
spec = importlib.util.spec_from_file_location("personal_tools_checks", root / "scripts/personal-tools-test.py")
checks = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checks)
checks.ASSEMBLY = root / "backend/Ottlog.Api/bin/ReminderChecks/net10.0/Ottlog.Api.dll"
with tempfile.TemporaryDirectory(prefix="wechat-http-", dir=root / "test-results") as folder:
    with checks.server(pathlib.Path(folder)) as base:
        anonymous = checks.Client(base)
        code, config, headers = anonymous.call("/api/wechat/reminders/config")
        assert code == 200 and config["enabled"] is False and config["templateId"] == "" and config["reason"]
        assert set(config) == {"enabled", "templateId", "reason", "requiresSubscription"}
        assert "no-store" in headers["Cache-Control"]
        assert anonymous.call("/api/wechat/reminders")[0] == 401
        assert anonymous.call("/api/wechat/reminders/bind", "POST", {"code": "unused"})[0] == 401
        code, pomodoro_config, _ = anonymous.call("/api/wechat/pomodoro/config")
        assert code == 200 and pomodoro_config["enabled"] is False and pomodoro_config["templates"] == [] and pomodoro_config["reason"]
        assert set(pomodoro_config) == {"enabled", "templates", "reason", "requiresSubscription"}
        assert anonymous.call("/api/wechat/pomodoro")[0] == 401
        account = checks.Client(base)
        account.create("reminder_http_check")
        assert account.call("/api/wechat/reminders")[1] == {"reminders": []}
        assert account.call("/api/wechat/reminders/bind", "POST", {"code": "unused"}, csrf=False)[0] == 400
        assert account.call("/api/wechat/reminders/bind", "POST", {"code": "unused"})[0] == 503
        assert account.call("/api/wechat/reminders", "POST", {"taskId": "valid-task", "remindAt": "2027-01-01T08:00:00Z", "subscriptionGranted": True})[0] == 503
        assert account.call("/api/wechat/reminders/unused", "DELETE", csrf=False)[0] == 400
        assert account.call("/api/wechat/reminders/unused", "DELETE")[0] == 204
        assert account.call("/api/wechat/reminders/bind", "POST", {"code": "x" * 513})[0] == 400
        assert account.call("/api/wechat/reminders", "POST", {"taskId": "../other", "remindAt": "2027-01-01T08:00:00Z", "subscriptionGranted": True})[0] == 400
        assert account.call("/api/wechat/pomodoro")[1] == {"reminders": []}
        assert account.call("/api/wechat/pomodoro", "POST", {"runId": "round", "events": ["focus_start"]}, csrf=False)[0] == 400
        assert account.call("/api/wechat/pomodoro", "POST", {"runId": "round", "events": ["focus_start"]})[0] == 503
        assert account.call("/api/wechat/pomodoro", "POST", {"runId": "../other", "events": ["focus_start"]})[0] == 400
        assert account.call("/api/wechat/pomodoro/unused", "DELETE", csrf=False)[0] == 400
        assert account.call("/api/wechat/pomodoro/unused?expectedDeadline=0", "DELETE")[0] == 400
        assert account.call("/api/wechat/pomodoro/unused", "DELETE")[0] == 204
print("PASS: reminder HTTP authorization, CSRF, input bounds, disabled configuration and idempotent cancellation; no real WeChat requests.")
