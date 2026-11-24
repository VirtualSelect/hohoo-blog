"""Run the frozen Java cancellation study offline after obtaining its pinned source and JDK."""
import argparse
from contextlib import contextmanager
import hashlib
from http.client import HTTPConnection
from http.server import BaseHTTPRequestHandler, HTTPServer
import json
from pathlib import Path
import platform
from queue import Queue
import runpy
import shutil
import subprocess
import sys
from threading import Thread

HERE = Path(__file__).resolve().parent
PROTOCOL = HERE / "protocol.json"
PROTOCOL_HASH = "37389f71a47b53945167c929299dc9cd714bd048f541dcbe5862b4fc57b171d6"
JOURNALS = ("intents", "started", "cancellations", "receiver", "receipts", "history")


def digest(data):
    return hashlib.sha256(data).hexdigest()


def source_digest(path):
    return digest(path.read_bytes().replace(b"\r\n", b"\n"))


def require(condition, message):
    if not condition:
        raise ValueError(message)


def prepare(repo, root, javac, spec):
    source = root / "source"
    classes = root / "classes"
    source.mkdir()
    classes.mkdir()
    for name, sha in spec["sha256LF"].items():
        obj = spec["commit"] + ":" + spec["directory"] + "/" + name
        data = subprocess.check_output(["git", "-C", str(repo), "show", obj])
        require(digest(data.replace(b"\r\n", b"\n")) == sha, "Source mismatch: " + name)
        (source / name).write_bytes(data)
    shutil.copyfile(HERE / "CancellationStudy.java", source / "CancellationStudy.java")
    subprocess.run([str(javac), "-encoding", "UTF-8", "-source", "8", "-target", "8",
                    "-d", str(classes), *map(str, sorted(source.glob("*.java")))], check=True)
    return classes, runpy.run_path(str(source / "audit.py"))["decode"]


@contextmanager
def observed_receiver(command, store):
    # A transparent loopback relay counts actual POSTs, independently of the receiver's idempotent WAL.
    process = subprocess.Popen(command + ["Workflow", "serve", str(store / "receiver.wal"), "true"],
                               stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    try:
        lines = Queue()
        Thread(target=lambda: lines.put(process.stdout.readline()), daemon=True).start()
        ready = lines.get(timeout=15).strip()
        require(ready.startswith("READY "), "Receiver could not bind to loopback: " + ready)
        port = int(ready.split()[1])
        requests = []

        class Relay(BaseHTTPRequestHandler):
            def do_POST(self):
                if self.path != "/effect":
                    self.send_error(404)
                    return
                key = self.headers.get("Idempotency-Key")
                length = int(self.headers["Content-Length"])
                body = self.rfile.read(length)
                requests.append({"key": key, "body": body.decode("ascii")})
                conn = HTTPConnection("127.0.0.1", port, timeout=4)
                try:
                    conn.request("POST", "/effect", body=body, headers={"Idempotency-Key": key})
                    response = conn.getresponse()
                    data = response.read()
                    self.send_response(response.status)
                    self.send_header("Content-Length", str(len(data)))
                    self.end_headers()
                    self.wfile.write(data)
                finally:
                    conn.close()

            def log_message(self, *_args):
                pass

        with HTTPServer(("127.0.0.1", 0), Relay) as relay:
            thread = Thread(target=relay.serve_forever, kwargs={"poll_interval": .02}, daemon=True)
            thread.start()
            try:
                yield str(relay.server_port), requests
            finally:
                relay.shutdown()
                thread.join(timeout=5)
    finally:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()
        process.stdout.close()


def journal_evidence(store, decode):
    evidence = {}
    for name in JOURNALS:
        path = store / (name + ".wal")
        raw = path.read_bytes() if path.exists() else b""
        records = [{"key": key, "body": body, "ordinal": ordinal}
                   for key, body, ordinal in (decode(path) if raw else [])]
        # Absent and zero-length journals both have no durable record.
        evidence[name] = {"records": records, "sha256": digest(raw)}
    return evidence


def study(case, settings, store, command, decode):
    store.mkdir()
    calls = []
    key, body = settings["input"]["key"], settings["input"]["body"]

    def call(label, args, expected=0):
        result = subprocess.run(command + list(map(str, args)), capture_output=True, text=True, timeout=20)
        calls.append({"stage": label, "exit": result.returncode, "output": result.stdout.strip()})
        require(result.returncode == expected, f"{case['id']} {label}: {result.returncode} {result.stderr}")
        return result.stdout.strip()

    call("intent", ["Workflow", "apply", store / "intents.wal", key, body, "none"])
    checkpoints = []

    def checkpoint(label, requests):
        journals = journal_evidence(store, decode)
        counts = {name: len(journals[name]["records"]) for name in JOURNALS}
        checkpoints.append({"stage": label, "posts": len(requests), **counts})

    with observed_receiver(command, store) as (port, requests):
        if case["fault"]:
            call("interrupted-dispatch", ["CancellationStudy", "recover", store, key, port, case["fault"]],
                 expected=settings["faultExit"])
        checkpoint("before-cancellation", requests)
        if case["cancel"]:
            call("cancel", ["CancellationStudy", "cancel", store, key])
        checkpoint("before-recovery", requests)

        for attempt in range(1, settings["recoveryRuns"] + 1):
            label = f"recovery-{attempt}"
            if case["mode"] == "baseline":
                call(label, ["Workflow", "resume", store, port, "none"])
                status = "BASELINE_RETURNED"
            else:
                status = call(label, ["CancellationStudy", "recover", store, key, port, "none"])
            require(status == case["status"], case["id"] + ": unexpected recovery status " + status)
            checkpoint(label, requests)

    prior = checkpoints[0]
    reached_receiver = int(case["fault"] in ("delivery", "receipt"))
    require(prior["posts"] == prior["receiver"] == reached_receiver
            and prior["receipts"] == int(case["fault"] == "receipt") and prior["history"] == 0,
            case["id"] + ": fault occurred at a different durable boundary")
    if case["mode"] == "guarded" and case["cancel"]:
        require(all(snapshot["posts"] == prior["posts"] for snapshot in checkpoints[1:]),
                case["id"] + ": recovery sent another POST after cancellation")
    first, second = checkpoints[-2:]
    require({k: v for k, v in first.items() if k != "stage"} ==
            {k: v for k, v in second.items() if k != "stage"}, "Repeat recovery changed counts")
    journals = journal_evidence(store, decode)
    counts = {"posts": len(requests), "effects": second["receiver"],
              "receipts": second["receipts"], "history": second["history"]}
    require(counts == case["expected"], f"{case['id']}: expected {case['expected']}, observed {counts}")
    require(all(row == {"key": key, "body": body} for row in requests), "HTTP key/body changed")
    expected_bodies = {
        "intents": [body], "cancellations": ["cancel-requested"] if case["cancel"] else [],
        "started": [body] if case["mode"] == "guarded" and case["fault"] else [],
        "receiver": [body] * counts["effects"], "receipts": ["1"] * counts["receipts"],
        "history": [body + " => 1"] * counts["history"],
    }
    for name, bodies in expected_bodies.items():
        expected = [{"key": key, "body": text, "ordinal": i + 1} for i, text in enumerate(bodies)]
        require(journals[name]["records"] == expected, f"{case['id']}: {name} key/body mismatch")
    return {"id": case["id"], "statusAfterRecovery": status, "observed": counts,
            "checkpoints": checkpoints, "httpPosts": requests, "journals": journals, "processes": calls}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", required=True, type=Path, help="Local hohoo-ai-lab Git checkout")
    parser.add_argument("--java-home", required=True, type=Path, help="JDK 8 containing bin/java and bin/javac")
    parser.add_argument("--run-dir", required=True, type=Path, help="New directory for class files, WALs and report")
    args = parser.parse_args()
    require(source_digest(PROTOCOL) == PROTOCOL_HASH, "Frozen protocol changed; version a new study")
    settings = json.loads(PROTOCOL.read_text(encoding="utf-8"))
    root = args.run_dir.resolve()
    root.mkdir(parents=True, exist_ok=False)
    ext = ".exe" if sys.platform == "win32" else ""
    java = args.java_home.resolve() / "bin" / ("java" + ext)
    javac = java.with_name("javac" + ext)
    version = subprocess.check_output([str(java), "-version"], stderr=subprocess.STDOUT, text=True).splitlines()
    require('"1.8.' in version[0], "Use JDK 8 for this protocol")
    classes, decode = prepare(args.repo, root, javac, settings["source"])
    command = [str(java), "-Djava.net.useSystemProxies=false", "-Dhttp.nonProxyHosts=127.0.0.1",
               "-cp", str(classes)]
    cases = [study(case, settings, root / case["id"], command, decode) for case in settings["scenarios"]]
    output = {
        "study": "java-cancellation-recovery", "version": settings["version"], "date": settings["date"],
        "scope": settings["scope"], "policy": settings["policy"], "upstream": settings["source"],
        "method": "The unmodified baseline receives the same cancellation marker but never reads it. "
                  "An independent loopback relay logs actual POSTs. Only the auditor reads the keyed "
                  "receiver's WAL. The dispatcher derives its reported status from its own durable files.",
        "studySourcesSha256LF": {name: source_digest(HERE / name)
                                 for name in ("protocol.json", "CancellationStudy.java", "run.py")},
        "environment": {"system": platform.system(), "release": platform.release(), "machine": platform.machine(),
                        "java": version, "python": platform.python_version()},
        "cases": cases,
    }
    destination = root / "java-cancellation-recovery-20261125.json"
    destination.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(destination)
    for case in cases:
        print(case["id"], case["statusAfterRecovery"], case["observed"])


if __name__ == "__main__":
    main()
