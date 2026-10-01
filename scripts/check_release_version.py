"""Fail a release build when its tag and packaged versions disagree."""

import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def main(tag: str) -> None:
    if not re.fullmatch(r"v\d+\.\d+\.\d+", tag):
        raise ValueError(f"Release tag must use vMAJOR.MINOR.PATCH: {tag}")

    version = tag[1:]
    versions = {}
    for package in ("frontend", "desktop"):
        manifest = json.loads((ROOT / package / "package.json").read_text())
        lock = json.loads((ROOT / package / "package-lock.json").read_text())
        versions[f"{package}/package.json"] = manifest["version"]
        versions[f"{package}/package-lock.json"] = lock["version"]
        versions[f"{package}/package-lock.json root package"] = lock["packages"][""]["version"]

    backend = (ROOT / "backend/app/core/config.py").read_text()
    match = re.search(r'API_VERSION:\s*str\s*=\s*"([^"]+)"', backend)
    versions["backend API_VERSION"] = match.group(1) if match else None

    for source, actual in versions.items():
        if actual != version:
            raise ValueError(f"{source} is {actual!r}; expected {version!r}")

    changelog = (ROOT / "CHANGELOG.md").read_text()
    if not re.search(rf"^## \[{re.escape(tag)}\] - \d{{4}}-\d{{2}}-\d{{2}}$", changelog, re.M):
        raise ValueError(f"CHANGELOG.md has no dated heading for {tag}")

    print(f"Release versions and changelog match {tag}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python scripts/check_release_version.py vMAJOR.MINOR.PATCH")
    main(sys.argv[1])
