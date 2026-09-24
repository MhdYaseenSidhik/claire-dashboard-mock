"""Acceptance tests for hello.py.

Runnable by one command from the repo root:  pytest

Each test maps to one acceptance criterion for the "hello world" ticket:
  AC1 - hello.py exists and is a runnable Python program.
  AC2 - running it prints exactly "Hello, World!" and exits 0.
  AC3 - hello.py is a single small file (no unrelated content sneaks in).
"""

import subprocess
import sys
from pathlib import Path

HELLO = Path(__file__).resolve().parent / "hello.py"


def test_hello_file_exists():
    """AC1: the program exists where it is expected."""
    assert HELLO.is_file(), f"hello.py not found at {HELLO}"


def test_hello_prints_exactly_hello_world():
    """AC2: exit 0 and stdout is exactly "Hello, World!\\n"."""
    result = subprocess.run(
        [sys.executable, str(HELLO)],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, (
        f"exit code {result.returncode}, stderr={result.stderr!r}"
    )
    assert result.stdout == "Hello, World!\n", (
        f"unexpected stdout: {result.stdout!r}"
    )
    assert result.stderr == "", f"unexpected stderr: {result.stderr!r}"


def test_hello_is_minimal_single_file():
    """AC3: the program is one short file with a single print statement."""
    lines = [
        line
        for line in HELLO.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    assert len(lines) == 1, f"expected one statement, got {len(lines)}: {lines!r}"
    assert lines[0].strip() == 'print("Hello, World!")'
