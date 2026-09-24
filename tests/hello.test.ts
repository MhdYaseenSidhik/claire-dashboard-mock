// Acceptance tests for hello.py — runs in a Node environment because it
// spawns the Python program and inspects real process output.
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Repo root is one level up from this tests/ directory.
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const helloPath = resolve(repoRoot, 'hello.py');
const python = process.env.PYTHON ?? 'python3';

describe('hello.py — "Hello, World!" program', () => {
  it('exists at the repository root', () => {
    expect(existsSync(helloPath)).toBe(true);
  });

  it('is a single-line program that calls print', () => {
    const codeLines = readFileSync(helloPath, 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'));
    expect(codeLines).toEqual(['print("Hello, World!")']);
  });

  it('prints exactly "Hello, World!" then a newline, and exits 0', () => {
    // execFileSync throws on a non-zero exit, so a clean return proves exit 0.
    const stdout = execFileSync(python, [helloPath], { encoding: 'utf8' });
    expect(stdout).toBe('Hello, World!\n');
  });
});
