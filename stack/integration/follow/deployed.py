#!/usr/bin/env python3
"""Print status/deployed.json for a stack in follow mode.

Reads what follow.sh and serve.sh record under the releases directory:
<app>/state.json (the decision for the checkout's tree), <app>/serving.json (the
release the server runs), <release>/release.json (what a release was built from) and
install.json (a `pnpm install` that failed, which stopped every app's build).
Each app's `revision` is the commit its *served* release stands for: the checkout's
commit when the served release is the current one and the commit changed nothing
that app's build reads, otherwise the commit that release was built from.
"""

import argparse
import datetime
import json
import os
from typing import Any, Optional


def _read(path: str) -> dict[str, Any] | None:
    try:
        with open(path) as f:
            data = json.load(f)
            return data if isinstance(data, dict) else None
    except (OSError, ValueError):
        return None


def _app_status(releases: str, app: str, source: str) -> dict[str, Any]:
    base = os.path.join(releases, app)
    state = _read(os.path.join(base, "state.json")) or {}
    serving = _read(os.path.join(base, "serving.json")) or {}
    served = serving.get("release")
    built = (
        _read(os.path.join(base, served, "release.json")) if served else None
    ) or {}
    if served and served == state.get("release"):
        revision = state.get("revision")
    else:
        revision = built.get("revision")
    return {
        "source": source,
        "revision": revision if served else None,
        "release": served,
        "built_from": built.get("revision"),
        "built_at": built.get("built_at"),
        "serving_since": serving.get("since"),
        "status": state.get("status") or ("deployed" if served else "pending"),
        "failed": state.get("failed"),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--releases", required=True)
    parser.add_argument(
        "--apps", required=True, help='"<app>:<base path>" pairs, space separated'
    )
    parser.add_argument("--source", required=True, help="follow:<branch>")
    parser.add_argument("--checkout", default="", help="the checkout's commit")
    parser.add_argument("--upgrade-status", default="OK")
    parser.add_argument("--upgrade-detail", default="")
    parser.add_argument("--site", default=None)
    parser.add_argument("--network", default=None)
    parser.add_argument(
        "--disk-free-bytes", type=int, default=None, help="free on the checkout's filesystem"
    )
    parser.add_argument("--disk-min-free-bytes", type=int, default=None)
    args = parser.parse_args()

    services = {
        entry.split(":", 1)[0]: _app_status(
            args.releases, entry.split(":", 1)[0], args.source
        )
        for entry in args.apps.split()
    }
    upgrade_status, upgrade_detail = args.upgrade_status, args.upgrade_detail
    failed = {
        app: s["failed"]
        for app, s in services.items()
        if s["status"] in ("ROLLED-BACK", "FAILED")
    }
    reasons = []
    install = _read(os.path.join(args.releases, "install.json"))
    serving_checkout = bool(args.checkout) and all(
        s["revision"] == args.checkout for s in services.values()
    )
    if install and not serving_checkout:
        reasons.append(
            f"pnpm install failed at {install.get('revision') or 'the tree'} ({install.get('log')}); "
            "every app keeps its release"
        )
    reasons += [
        f"{app}: {f.get('stage')} failed at {f.get('revision') or 'the tree'} ({f.get('log')})"
        for app, f in failed.items()
    ]
    if upgrade_status == "OK" and reasons:
        upgrade_status = "ROLLED-BACK"
        upgrade_detail = "; ".join(reasons)
    disk = {}
    if args.disk_free_bytes is not None:
        disk = {
            "disk_low": args.disk_min_free_bytes is not None
            and args.disk_free_bytes < args.disk_min_free_bytes,
            "disk_free_bytes": args.disk_free_bytes,
            "disk_min_free_bytes": args.disk_min_free_bytes,
        }
    print(
        json.dumps(
            {
                "site": args.site,
                "network": args.network,
                "mode": "follow",
                "source": args.source,
                "stack_checkout": args.checkout or None,
                "upgrade": {"status": upgrade_status, "detail": upgrade_detail or None},
                **disk,
                "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),  # noqa: UP017 - the image runs Python 3.10
                "services": services,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
