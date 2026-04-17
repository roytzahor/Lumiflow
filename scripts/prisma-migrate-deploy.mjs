#!/usr/bin/env node
/**
 * Runs `prisma migrate deploy` with a longer advisory-lock timeout and retries
 * on P1002 (Neon / concurrent deploys often hit short default timeouts).
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createRequire } from "node:module";
import { setTimeout as delay } from "node:timers/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);
const prismaCli = require.resolve("prisma/build/index.js");

const attempts = Math.max(1, Number(process.env.PRISMA_MIGRATE_ATTEMPTS ?? 5));
const waitMs = Math.max(0, Number(process.env.PRISMA_MIGRATE_RETRY_MS ?? 12000));
const lockTimeoutMs = Math.max(10000, Number(process.env.PRISMA_MIGRATE_ADVISORY_LOCK_TIMEOUT ?? 120000));

function runOnce() {
  return new Promise((resolve) => {
    const env = {
      ...process.env,
      PRISMA_MIGRATE_ADVISORY_LOCK_TIMEOUT: String(lockTimeoutMs),
    };
    const child = spawn(process.execPath, [prismaCli, "migrate", "deploy"], {
      cwd: root,
      env,
      stdio: ["inherit", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => {
      stdout += d;
      process.stdout.write(d);
    });
    child.stderr?.on("data", (d) => {
      stderr += d;
      process.stderr.write(d);
    });
    child.on("close", (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
    child.on("error", (err) => {
      stderr += String(err);
      resolve({ code: 1, stdout, stderr });
    });
  });
}

function isAdvisoryLockFailure(out) {
  return (
    out.includes("P1002") ||
    out.includes("advisory lock") ||
    out.includes("Timed out trying to acquire")
  );
}

for (let i = 1; i <= attempts; i++) {
  const { code, stdout, stderr } = await runOnce();
  if (code === 0) {
    process.exit(0);
  }
  const combined = stdout + stderr;
  const retryable = isAdvisoryLockFailure(combined) && i < attempts;
  if (retryable) {
    console.warn(
      `[migrate] attempt ${i}/${attempts} failed (lock/timeout, PRISMA_MIGRATE_ADVISORY_LOCK_TIMEOUT=${lockTimeoutMs}ms), retrying in ${waitMs}ms...`
    );
    await delay(waitMs);
    continue;
  }
  process.exit(code);
}
