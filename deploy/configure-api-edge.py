#!/usr/bin/env python3
"""Stage or activate an API-only public edge on the existing private deployment.

Run on the server as its deployment user with passwordless sudo for Docker.
Nothing is activated without --apply and verified DNS. Existing API/web images,
business volumes, secrets and the loopback website entry are retained.
"""
import argparse
import datetime as dt
import json
import os
from pathlib import Path
import re
import shutil
import socket
import subprocess
import time
import uuid
import urllib.error
import urllib.request


def docker(*args, env=None):
    prefix = ["sudo", "-n"]
    if env is not None:
        # sudo normally drops deployment variables; forward only these two
        # non-secret values. The existing private env file stays on the server.
        prefix += ["env", "OTTLOG_API_HOST=" + env["OTTLOG_API_HOST"],
                   "OTTLOG_API_EDGE_DIRECTORY=" + env["OTTLOG_API_EDGE_DIRECTORY"]]
    return subprocess.run([*prefix, "docker", *args], check=True,
                          capture_output=True, text=True, env=env).stdout.strip()


def inside(path, root):
    value = Path(path).resolve(strict=True)
    if not value.is_relative_to(root):
        raise RuntimeError(f"Deployment path is outside {root}: {value}")
    return value


def request(url, expected, body=None, headers=None):
    try:
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
        with opener.open(urllib.request.Request(url, headers=headers or {}), timeout=15) as response:
            status, content = response.status, response.read()
    except urllib.error.HTTPError as error:
        status, content = error.code, error.read()
    if status != expected or body is not None and content.decode().strip() != body:
        raise RuntimeError(f"Unexpected response for {url}: HTTP {status}")
    return content


def check_routes(proxy, edge, host, web_host=None):
    """Exercise the real Caddy routes on an unpublished, temporary container."""
    name = "ottlog-api-edge-check-" + uuid.uuid4().hex[:12]
    network = next(iter(proxy["NetworkSettings"]["Networks"]))
    temporary = edge / (name + ".caddy")
    content = (edge / "Caddyfile.api-private-web").read_text()
    content = content.replace("http://:8080 {", "http://:18081 {").replace("{$OTTLOG_API_HOST} {", "http://" + host + ":18080 {")
    content = content.replace("https://:443 {", "http://:18080 {")
    if web_host:
        content = content.replace(web_host + " {", "http://" + web_host + ":18080 {")
    temporary.write_text(content)
    container = None
    try:
        container = docker("run", "-d", "--name", name, "--network", network,
                           "--read-only", "--cap-drop", "ALL", "--cap-add", "NET_BIND_SERVICE", "--security-opt", "no-new-privileges",
                           "--tmpfs", "/config", "--tmpfs", "/data", "--volume",
                           str(temporary) + ":/etc/caddy/Caddyfile:ro", proxy["Image"])
        # Docker can return before the network endpoint is attached.
        inspected = None
        for _ in range(20):
            inspected = json.loads(docker("inspect", container))[0]
            if inspected["State"]["Status"] == "exited":
                logs = subprocess.run(["sudo", "-n", "docker", "logs", container], capture_output=True, text=True)
                raise RuntimeError("Caddy route-test startup failed: " + logs.stdout + logs.stderr + inspected["State"].get("Error", ""))
            if inspected["NetworkSettings"]["Networks"][network]["IPAddress"]:
                break
            time.sleep(.2)
        if inspected["HostConfig"]["PortBindings"]:
            raise RuntimeError("Route test must not publish ports")
        address = inspected["NetworkSettings"]["Networks"][network]["IPAddress"]
        if not address:
            raise RuntimeError("The isolated Caddy container did not receive an address")
        public = "http://" + address + ":18080"
        private = "http://" + address + ":18081"
        for attempt in range(10):
            try:
                request(public + "/health", 200, "Healthy", {"Host": host})
                break
            except (OSError, RuntimeError):
                if attempt == 9:
                    raise
                time.sleep(1)
        for path in ("/", "/today", "/todos", "/articles", "/admin", "/feed.xml", "/api/auth/session", "/api/admin/posts"):
            request(public + path, 404, headers={"Host": host})
        request(public + "/health", 404, headers={"Host": "invalid.example"})
        request(public + "/api/personal-tools/todos", 401, headers={"Host": host})
        # This unpublished HTTP fixture is deliberately not a trusted reverse
        # proxy. Full Secure-cookie/CSRF login is checked through real TLS later.
        request(public + "/api/account/profile", 200, headers={"Host": host})
        request(private + "/today", 200)
        request(private + "/api/account/profile", 200)
        if web_host:
            request(public + "/", 200, headers={"Host": web_host})
            request(public + "/today", 200, headers={"Host": web_host})
            if b"<svg" not in request(public + "/images/ottlog-logo.svg", 200, headers={"Host": web_host}):
                raise RuntimeError("Website image routing failed")
        print("PASS isolated real-Caddy routing: API/profile reachable, anonymous data denied, website/admin/wrong host denied, private website reachable")
    finally:
        if container:
            docker("rm", "-f", container)
        temporary.unlink(missing_ok=True)


def verify(host, web_host=None):
    base = "https://" + host
    request(base + "/health", 200, "Healthy")
    request(base + "/health/ready", 200)
    account = json.loads(request(base + "/api/account/profile?channel=mini", 200))
    if account.get("authenticated") is not False:
        raise RuntimeError("Anonymous profile unexpectedly authenticated")
    for path in ("todos", "habits", "mottos", "articles", "domains"):
        request(base + "/api/personal-tools/" + path, 401)
    for path in ("/", "/today", "/admin", "/articles", "/feed.xml", "/api/auth/session", "/api/admin/posts"):
        request(base + path, 404)
    request("http://127.0.0.1:8088/today", 200)
    request("http://127.0.0.1:8088/health", 200, "Healthy")
    if web_host:
        for path in ("/", "/today", "/todos", "/daily", "/domains", "/articles"):
            request("https://" + web_host + path, 200)
        request("https://" + web_host + "/health", 200, "Healthy")
        if b"<svg" not in request("https://" + web_host + "/images/ottlog-logo.svg", 200):
            raise RuntimeError("Website branding image was not served")
    print("PASS trusted HTTPS API, anonymous isolation, public website/admin denied and private website retained")
    if web_host:
        print("PASS public website HTTPS and core navigation")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="api.ohtautau.com")
    parser.add_argument("--ipv4", default="43.134.239.75")
    parser.add_argument("--root", type=Path, default=Path.home() / "ottlog")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--verify", action="store_true")
    parser.add_argument("--check-routes", action="store_true")
    parser.add_argument("--public-web", action="store_true", help='Also expose the website using its existing Caddyfile')
    parser.add_argument("--web-host", default="ohtautau.com")
    parser.add_argument("--web-image", help='Optional already-built website image; API image remains pinned to its running version')
    args = parser.parse_args()
    if not re.fullmatch(r"[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?", args.host) or "." not in args.host:
        parser.error("A public DNS hostname is required")
    if args.verify:
        verify(args.host, args.web_host if args.public_web else None)
        return
    root = args.root.resolve(strict=True)
    shared = inside(root / "shared", root)
    edge_home = shared / "api-direct"
    edge_home.mkdir(mode=0o700, exist_ok=True)
    if edge_home.resolve().parent != shared:
        raise RuntimeError("API edge directory must stay inside shared")
    # Never overwrite a file mounted by the running proxy while merely staging.
    edge = edge_home / (dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + uuid.uuid4().hex[:8])
    edge.mkdir(mode=0o700)
    sources = Path(__file__).resolve().parent
    for name in ("Caddyfile.api-private-web", "compose.api-private-web.yml"):
        destination = edge / name
        if destination.is_symlink():
            raise RuntimeError("Refusing a symlinked edge configuration")
        if (sources / name).resolve() != destination.resolve():
            shutil.copyfile(sources / name, destination)
        destination.chmod(0o600)
    if args.public_web:
        if args.web_host != "ohtautau.com":
            raise RuntimeError("The checked website Caddyfile is for ohtautau.com")
        web_config = (sources / "Caddyfile").read_text()
        if not web_config.startswith(args.web_host + " {"):
            raise RuntimeError("Unexpected public website Caddyfile")
        combined = edge / "Caddyfile.api-private-web"
        combined.write_text(combined.read_text() + "\n" + web_config)
    proxy = json.loads(docker("inspect", "ottlog-proxy-1"))[0]
    api = json.loads(docker("inspect", "ottlog-api-1"))[0]
    web = json.loads(docker("inspect", "ottlog-web-1"))[0]
    # The API may have a newer override than the proxy. Retain its active chain
    # (including bot authorization) rather than reviving an obsolete API image.
    labels = api["Config"]["Labels"]
    files = [inside(path, root) for path in labels["com.docker.compose.project.config_files"].split(",")]
    override = edge / "compose.api-private-web.yml"
    image_override = edge / "runtime-images.json"
    files = [path for path in files if path.name not in ("compose.api-private-web.yml", "runtime-images.json")] + [override, image_override]
    selected_web_image = args.web_image or web["Config"]["Image"]
    docker("image", "inspect", selected_web_image)
    image_override.write_text(json.dumps({"services": {
        "api": {"image": api["Config"]["Image"], "pull_policy": "never"},
        "web": {"image": selected_web_image, "pull_policy": "never"}}}, indent=2) + "\n")
    image_override.chmod(0o600)
    env_file = inside(labels["com.docker.compose.project.environment_file"], root)
    environment = {**os.environ, "OTTLOG_API_HOST": args.host, "OTTLOG_API_EDGE_DIRECTORY": str(edge)}
    command = ["compose", "--env-file", str(env_file)]
    for path in files:
        command.extend(["-f", str(path)])
    # Caddy validates the staged config in an isolated, non-listening container.
    docker("run", "--rm", "--network", "none", "--env", "OTTLOG_API_HOST=" + args.host,
           "--volume", str(edge / "Caddyfile.api-private-web") + ":/etc/caddy/Caddyfile:ro",
           proxy["Image"], "caddy", "validate", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile")
    rendered = json.loads(docker(*command, "config", "--format", "json", env=environment))
    ports = rendered["services"]["proxy"]["ports"]
    actual = {(item.get("host_ip", ""), str(item["published"]), str(item["target"])) for item in ports}
    if actual != {("127.0.0.1", "8088", "8080"), ("", "80", "80"), ("", "443", "443")}:
        raise RuntimeError("Unexpected proxy port configuration")
    if any(rendered["services"][name].get("ports") for name in ("api", "web")):
        raise RuntimeError("API and website containers must not publish their own ports")
    print("PASS staged Caddy and Compose; running API image and business volumes retained")
    if args.check_routes:
        check_routes(proxy, edge, args.host, args.web_host if args.public_web else None)
    if not args.apply:
        print("Prepared only; no containers or public listeners changed")
        return
    for host in [args.host, *([args.web_host] if args.public_web else [])]:
        addresses = {row[4][0] for row in socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)}
        if addresses != {args.ipv4}:
            raise RuntimeError(f"{host} must resolve only to the verified IPv4 {args.ipv4}; got {sorted(addresses)}")
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup = root / "backups" / ("api-edge-" + stamp)
    backup.mkdir(parents=True, mode=0o700)
    previous = {"composeFiles": labels["com.docker.compose.project.config_files"].split(","),
                "environmentFile": str(env_file), "image": proxy["Image"],
                "ports": proxy["HostConfig"]["PortBindings"],
                "apiImage": api["Config"]["Image"], "apiImageId": api["Image"],
                "webImage": web["Config"]["Image"], "webImageId": web["Image"],
                "proxyComposeFiles": proxy["Config"]["Labels"]["com.docker.compose.project.config_files"].split(",")}
    (backup / "proxy-before.json").write_text(json.dumps(previous, indent=2) + "\n")
    (backup / "proxy-before.json").chmod(0o600)
    for mount in proxy["Mounts"]:
        if mount["Destination"] == "/etc/caddy/Caddyfile" and mount["Type"] == "bind":
            shutil.copyfile(inside(mount["Source"], root), backup / "Caddyfile.before")
    if selected_web_image != web["Config"]["Image"]:
        docker(*command, "up", "-d", "--no-deps", "web", env=environment)
        for attempt in range(60):
            running_web = json.loads(docker("inspect", "ottlog-web-1"))[0]
            if running_web["State"].get("Health", {}).get("Status") == "healthy":
                break
            if attempt == 59:
                raise RuntimeError("New website did not become healthy; proxy not changed. Restore webImage from proxy-before.json")
            time.sleep(2)
    docker(*command, "up", "-d", "--no-deps", "proxy", env=environment)
    if json.loads(docker("inspect", "ottlog-api-1"))[0]["Image"] != api["Image"]:
        raise RuntimeError("Unexpected API image change")
    print(f"API edge activated for {args.host}; prior proxy metadata: {backup}")
    print("Run --verify once DNS, cloud firewall and automatic certificate issuance are ready")


if __name__ == "__main__":
    main()
