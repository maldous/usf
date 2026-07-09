#!/usr/bin/env python3
"""USF validate aggregator (USF-1039).

Runs the validator families passed as explicit --family arguments concurrently
and aggregates their results fail-closed. The family list is not defined here:
package.json scripts remain the single command-surface authority and carry the
exact canonical invocation strings, so the per-validator wiring rules keep
matching the real executed set. This tool only schedules.

Fail-closed properties: an empty family list is an error; a family whose entry
script is missing, that cannot start, or that exits non-zero fails the
aggregate; output is grouped per family and every failure's output is
reprinted at the end.

Exit codes: 0 all families passed; 1 one or more families failed; 2 bad input.
"""

import argparse
import concurrent.futures
import os
import shlex
import subprocess
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

SELFTEST_FIXTURES = "tools/validate-aggregate/selftest-fixtures"


def family_id(argv):
    for token in argv:
        if token.endswith(".py"):
            return os.path.basename(token).removesuffix(".py")
    return argv[0]


def parse_family(spec):
    """Parse one canonical family string of the form
    'python3 tools/<dir>/<script>.py <args...>' into an argv list."""
    argv = shlex.split(spec)
    if len(argv) < 2 or argv[0] != "python3" or not argv[1].endswith(".py"):
        return None
    return argv


def run_family(argv):
    script = os.path.join(ROOT, argv[1])
    start = time.monotonic()
    if not os.path.isfile(script):
        return argv, 2, time.monotonic() - start, "", f"validator entry script missing: {argv[1]}"
    try:
        proc = subprocess.run(
            [sys.executable or "python3", script, *argv[2:]],
            cwd=ROOT,
            capture_output=True,
            text=True,
        )
        return argv, proc.returncode, time.monotonic() - start, proc.stdout, proc.stderr
    except Exception as exc:  # fail closed on any spawn error
        return argv, 2, time.monotonic() - start, "", f"failed to execute family: {exc}"


def run_families(families, jobs, verbose):
    failures = []
    wall_start = time.monotonic()
    with concurrent.futures.ThreadPoolExecutor(max_workers=jobs) as pool:
        futures = [pool.submit(run_family, argv) for argv in families]
        for fut in concurrent.futures.as_completed(futures):
            argv, rc, dur, out, err = fut.result()
            status = "PASS" if rc == 0 else "FAIL"
            print(f"[validate-aggregate] {status} {dur:6.1f}s {family_id(argv)}", flush=True)
            if rc != 0:
                failures.append((argv, rc, out, err))
            elif verbose and out:
                print(out, flush=True)
    wall = time.monotonic() - wall_start
    print(
        f"[validate-aggregate] {len(families)} families, wall {wall:.1f}s, failures {len(failures)}",
        flush=True,
    )
    for argv, rc, out, err in failures:
        print(f"[validate-aggregate] FAILURE detail rc={rc}: {' '.join(argv)}", flush=True)
        if out:
            print(out, flush=True)
        if err:
            print(err, file=sys.stderr, flush=True)
    return len(failures) == 0


def selftest(jobs):
    """Planted-defect selftest: the aggregate MUST fail when any family fails
    or is missing, MUST pass for an all-pass set, and MUST reject an empty or
    malformed family list."""
    passing = [["python3", f"{SELFTEST_FIXTURES}/exit-zero.py"]]
    failing = passing + [["python3", f"{SELFTEST_FIXTURES}/exit-one.py"]]
    missing = passing + [["python3", f"{SELFTEST_FIXTURES}/does-not-exist.py"]]
    checks = [
        ("all-pass family set aggregates to pass", run_families(passing, jobs, False) is True),
        ("planted failing family fails the aggregate", run_families(failing, jobs, False) is False),
        ("missing family script fails the aggregate", run_families(missing, jobs, False) is False),
        ("malformed family string is rejected", parse_family("rm -rf /") is None),
        ("non-python family string is rejected", parse_family("bash tools/x.sh") is None),
    ]
    ok = True
    for name, result in checks:
        print(f"[validate-aggregate selftest] {'PASS' if result else 'FAIL'}: {name}", flush=True)
        ok = ok and result
    return ok


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=["run", "selftest"])
    parser.add_argument(
        "--family",
        action="append",
        default=[],
        help="canonical family invocation string, e.g. 'python3 tools/validate-spec/validate-spec.py all --json'",
    )
    parser.add_argument("--jobs", type=int, default=min(16, os.cpu_count() or 4))
    parser.add_argument("--verbose", action="store_true", help="print each family's stdout even on pass")
    args = parser.parse_args()

    if args.jobs < 1:
        print("error: --jobs must be >= 1", file=sys.stderr)
        return 2

    if args.mode == "selftest":
        return 0 if selftest(args.jobs) else 1

    if not args.family:
        print("error: no --family given; refusing to pass an empty validation set", file=sys.stderr)
        return 2
    families = []
    for spec in args.family:
        argv = parse_family(spec)
        if argv is None:
            print(f"error: malformed family invocation (expected 'python3 <script>.py ...'): {spec}", file=sys.stderr)
            return 2
        families.append(argv)
    return 0 if run_families(families, args.jobs, args.verbose) else 1


if __name__ == "__main__":
    sys.exit(main())
