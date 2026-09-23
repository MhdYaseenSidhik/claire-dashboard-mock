import subprocess
import sys


def test_hello_prints_exactly_hello_world():
    result = subprocess.run(
        [sys.executable, "hello.py"],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, f"exit code {result.returncode}, stderr={result.stderr!r}"
    assert result.stdout == "Hello, World!\n", f"unexpected stdout: {result.stdout!r}"
