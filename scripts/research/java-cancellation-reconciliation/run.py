"""Run the offline comparison against the pinned cancellation study."""

import argparse
from contextlib import closing, contextmanager
import hashlib
from http.client import HTTPConnection
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import platform
from queue import Queue
import runpy
import subprocess
import sys
from threading import Event, Thread


HERE = Path(__file__).resolve().parent
BASELINE = HERE.parent / "java-cancellation"
PROTOCOL_HASH = "5e8dd54d07ee87426c14db9b3b020cab2d91a09c2775390598365db17cb80d8f"
JOURNALS = ("intents", "started", "cancellations", "receiver", "receipts", "history")


def require(condition, message):
    if not condition:
        raise ValueError(message)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def fingerprint(path):
    return digest(path.read_bytes().replace(b"\r\n", b"\n"))


def read_journals(store):
    snapshots = {}
    for name in JOURNALS:
        path = store / (name + ".wal")
        snapshots[name] = path.read_bytes() if path.exists() else None
    return snapshots


@contextmanager
def observe_lookup(command, receiver, fault):
    service = subprocess.Popen(command + ["ReconciliationStudy", "serve", str(receiver)],
                               stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    try:
        lines = Queue()
        Thread(target=lambda: lines.put(service.stdout.readline()), daemon=True).start()
        ready = lines.get(timeout=15).strip()
        require(ready.startswith("READY "), "Lookup service did not start: " + ready)
        receiver_port = int(ready.split()[1])
        requests = []
        stop = Event()

        class Relay(BaseHTTPRequestHandler):
            def do_POST(self):
                requests.append({"method": "POST", "path": self.path})
                self.send_error(405)

            def do_GET(self):
                headers = {name: self.headers.get(name)
                           for name in ("Idempotency-Key", "X-Request-SHA256")}
                observed = {"method": "GET", "path": self.path, "headers": headers,
                            "httpStatus": None, "snapshot": None, "body": None}
                requests.append(observed)
                if fault == "timeout":
                    stop.wait(5)
                    return
                conn = HTTPConnection("127.0.0.1", receiver_port, timeout=4)
                try:
                    conn.request("GET", self.path, headers=headers)
                    result = conn.getresponse()
                    data = result.read()
                    if fault == "incomplete-proof":
                        data = data[:8]
                    snapshot = result.getheader("X-Reconciliation-Snapshot")
                    observed.update(httpStatus=result.status, snapshot=snapshot,
                                    body=data.decode("ascii"))
                    self.send_response(result.status)
                    for name in ("Content-Type", "X-Reconciliation-Snapshot",
                                 "Idempotency-Key", "X-Request-SHA256"):
                        value = result.getheader(name)
                        if value is not None:
                            self.send_header(name, value)
                    self.send_header("Content-Length", str(len(data)))
                    self.end_headers()
                    self.wfile.write(data)
                finally:
                    conn.close()

            def log_message(self, *_args):
                pass

        with ThreadingHTTPServer(("127.0.0.1", 0), Relay) as relay:
            worker = Thread(target=relay.serve_forever, kwargs={"poll_interval": .02}, daemon=True)
            worker.start()
            try:
                yield relay.server_port, requests
            finally:
                stop.set()
                relay.shutdown()
                worker.join()
    finally:
        service.terminate()
        try:
            service.wait(timeout=5)
        except subprocess.TimeoutExpired:
            service.kill()
            service.wait()
        service.stdout.close()


def run_case(case, spec, store, command, baseline, decode):
    store.mkdir()
    key, body = (spec["input"][name] for name in ("key", "body"))
    request_hash = digest(body.encode("ascii"))
    fault = case["fault"]
    processes = []

    def call(stage, *args, expected_exit=0):
        run = subprocess.run(command + list(map(str, args)), capture_output=True,
                             text=True, timeout=20)
        require(run.returncode == expected_exit,
                f"{case['id']} {stage}: exit {run.returncode} {run.stderr}")
        output = run.stdout.strip()
        processes.append({"stage": stage, "exit": run.returncode, "output": output})
        return output

    receiver = store / "receiver.wal"
    call("intent", "Workflow", "apply", store / "intents.wal", key, body, "none")
    with baseline["observed_receiver"](command, store) as (port, setup_posts):
        call("interrupted-dispatch", "CancellationStudy", "recover", store, key,
             port, case["setup"], expected_exit=23)
        if fault == "conflict":
            other = spec["conflictBody"]
            with closing(HTTPConnection("127.0.0.1", int(port), timeout=4)) as conn:
                conn.request("POST", "/effect", body=other, headers={"Idempotency-Key": key})
                response = conn.getresponse()
                require(response.status == 200 and response.read() == b"1",
                        "Conflicting receipt was not seeded")
        call("cancel", "CancellationStudy", "cancel", store, key)
        status = call("recover-cancelled", "CancellationStudy", "recover", store, key, port, "none")
        require(status == "CANCELLED_OUTCOME_UNKNOWN", "Cancellation baseline diverged")

    expected_body = spec["conflictBody"] if fault == "conflict" else body
    expected_posts = ([{"key": key, "body": expected_body}]
                      if case["setup"] == "delivery" or fault == "conflict" else [])
    require(setup_posts == expected_posts, "Setup POST evidence diverged")
    records = decode(receiver) if receiver.exists() else []
    expected_records = [(key, expected_body, 1)] if expected_posts else []
    require(records == expected_records, "Receiver ledger disagrees with setup traffic")
    if fault == "empty-snapshot":
        receiver.touch(exist_ok=False)
    if fault == "truncated-snapshot":
        with receiver.open("ab") as file:
            file.write(b"HOH")

    before = read_journals(store)
    require(not before["receipts"] and not before["history"],
            "This study starts without a receipt or successful history")
    for name, value in (("intents", body), ("started", body),
                        ("cancellations", "cancel-requested")):
        require(decode(store / (name + ".wal")) == [(key, value, 1)],
                f"Unexpected {name} evidence")

    traces = []
    for index in range(spec["lookupsPerCase"]):
        with observe_lookup(command, receiver, fault) as (port, calls):
            timeout = spec["faultReadTimeoutMs"] if fault == "timeout" else spec["readTimeoutMs"]
            result = call(f"lookup-{index + 1}", "ReconciliationStudy", "query",
                          port, key, request_hash, timeout)
        require(result == case["output"], f"{case['id']} returned {result}")
        require(len(calls) == 1 and calls[0]["method"] == "GET"
                and calls[0]["path"] == "/effect-status", "Lookup must send exactly one GET")
        require(calls[0]["headers"] == {"Idempotency-Key": key,
                                       "X-Request-SHA256": request_hash}, "Lookup identity changed")
        require(calls[0]["httpStatus"] == case["httpStatus"], "Unexpected lookup HTTP status")
        require(read_journals(store) == before, "Lookup changed bytes or created a business journal")
        traces.append({**calls[0], "outcome": result, "journalsUnchanged": True})

    return {
        "id": case["id"],
        "localStatusBeforeLookup": status,
        "setupPosts": setup_posts,
        "receiverRecordsBeforeFaultInjection": [
            {"key": row[0], "body": row[1], "ordinal": row[2]} for row in records
        ],
        "lookupAdditionalPosts": sum(trace["method"] == "POST" for trace in traces),
        "journalsAtAllCheckpoints": {
            name: None if data is None else {"bytes": len(data), "sha256": digest(data)}
            for name, data in before.items()
        },
        "lookups": traces,
        "processes": processes,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, required=True, help="Local hohoo-ai-lab Git checkout")
    parser.add_argument("--java-home", type=Path, required=True, help="JDK 8 installation")
    parser.add_argument("--run-dir", type=Path, required=True, help="New directory for evidence")
    args = parser.parse_args()

    require(fingerprint(HERE / "protocol.json") == PROTOCOL_HASH, "Frozen protocol changed")
    spec = json.loads((HERE / "protocol.json").read_text(encoding="utf-8"))
    for name, expected in spec["baselineSha256LF"].items():
        require(fingerprint(BASELINE / name) == expected, "Baseline source mismatch: " + name)
    baseline = runpy.run_path(str(BASELINE / "run.py"))
    upstream = json.loads((BASELINE / "protocol.json").read_text(encoding="utf-8"))["source"]
    root = args.run_dir.resolve()
    root.mkdir(parents=True, exist_ok=False)
    suffix = ".exe" if sys.platform == "win32" else ""
    java = args.java_home.resolve() / "bin" / ("java" + suffix)
    javac = java.with_name("javac" + suffix)
    version = subprocess.check_output([str(java), "-version"], stderr=subprocess.STDOUT,
                                      text=True).splitlines()
    require('"1.8.' in version[0], "Use JDK 8 for this study")
    classes, decode = baseline["prepare"](args.repo, root, javac, upstream)
    subprocess.run([str(javac), "-encoding", "UTF-8", "-source", "8", "-target", "8",
                    "-cp", str(classes), "-d", str(classes),
                    str(HERE / "ReconciliationStudy.java")], check=True)
    command = [str(java), "-Djava.net.useSystemProxies=false", "-cp", str(classes)]
    cases = [run_case(case, spec, root / case["id"], command, baseline, decode)
             for case in spec["cases"]]
    report = {
        "study": "java-cancellation-read-only-reconciliation",
        "version": spec["version"],
        "date": spec["date"],
        "scope": spec["scope"],
        "baselineCommit": spec["baselineCommit"],
        "baselineSha256LF": spec["baselineSha256LF"],
        "upstream": upstream,
        "sourceSha256LF": {
            name: fingerprint(HERE / name)
            for name in ("protocol.json", "run.py", "ReconciliationStudy.java")
        },
        "environment": {"system": platform.system(), "machine": platform.machine(),
                        "java": version, "python": platform.python_version()},
        "cases": cases,
    }
    output = root / "java-cancellation-reconciliation-20261125.json"
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(output)
    for case in cases:
        print(case["id"], case["lookups"][0]["outcome"])


if __name__ == "__main__":
    main()
