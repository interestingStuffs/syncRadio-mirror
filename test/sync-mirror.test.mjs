import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { syncMirror } from "../scripts/sync-mirror.mjs";

async function createRepository(root) {
  await mkdir(join(root, "src"), { recursive: true });
  await mkdir(join(root, ".github"), { recursive: true });
  await mkdir(join(root, "samples"), { recursive: true });
  await mkdir(join(root, "scripts"), { recursive: true });
  await writeFile(join(root, "src", "app.mjs"), "export const version = 'new';\n");
  await writeFile(join(root, "src", "old.mjs"), "old code\n");
  await writeFile(join(root, "config.json"), '{"upstream": true}\n');
  await writeFile(join(root, "samples", "upstream.csv"), "upstream\n");
  await writeFile(join(root, "scripts", "test.mjs"), "upstream script\n");
  await writeFile(join(root, ".github", "workflow.yml"), "upstream workflow\n");
  await writeFile(join(root, "README.md"), "mirror\n");
  spawnSync("git", ["init", "--quiet"], { cwd: root });
  spawnSync("git", ["config", "user.email", "test@example.com"], { cwd: root });
  spawnSync("git", ["config", "user.name", "Test User"], { cwd: root });
  spawnSync("git", ["add", "."], { cwd: root });
  spawnSync("git", ["commit", "--quiet", "-m", "initial"], { cwd: root });
}

test("syncMirror copies upstream content while preserving mirror-specific paths", async (t) => {
  const source = await mkdtemp(join(tmpdir(), "sync-source-"));
  const destination = await mkdtemp(join(tmpdir(), "sync-destination-"));
  t.after(() => Promise.all([rm(source, { recursive: true, force: true }), rm(destination, { recursive: true, force: true })]));

  await createRepository(source);
  await mkdir(join(destination, "src"), { recursive: true });
  await mkdir(join(destination, "samples"), { recursive: true });
  await mkdir(join(destination, "scripts"), { recursive: true });
  await writeFile(join(destination, "src", "app.mjs"), "old\n");
  await writeFile(join(destination, "src", "stale.mjs"), "stale\n");
  await writeFile(join(destination, "config.json"), "old configuration\n");
  await writeFile(join(destination, "samples", "old.csv"), "old sample\n");
  await writeFile(join(destination, "scripts", "test.mjs"), "test\n");
  await writeFile(join(destination, "README.md"), "old readme\n");
  spawnSync("git", ["init", "--quiet"], { cwd: destination });
  spawnSync("git", ["config", "user.email", "test@example.com"], { cwd: destination });
  spawnSync("git", ["config", "user.name", "Test User"], { cwd: destination });
  spawnSync("git", ["add", "."], { cwd: destination });
  spawnSync("git", ["commit", "--quiet", "-m", "initial"], { cwd: destination });

  const result = await syncMirror(source, destination);

  assert.equal(result.changed, true);
  assert.equal(await readFile(join(destination, "src", "app.mjs"), "utf8"), "export const version = 'new';\n");
  assert.equal(await readFile(join(destination, "config.json"), "utf8"), "old configuration\n");
  assert.equal(await readFile(join(destination, "samples", "old.csv"), "utf8"), "old sample\n");
  assert.equal(await readFile(join(destination, "scripts", "test.mjs"), "utf8"), "test\n");
  assert.equal(await readFile(join(destination, "README.md"), "utf8"), "mirror\n");
  assert.equal(await readdir(join(destination, "src")).then((entries) => entries.includes("stale.mjs")), false);
});

test("syncMirror is idempotent when source and destination are already synchronized", async (t) => {
  const source = await mkdtemp(join(tmpdir(), "sync-source-"));
  const destination = await mkdtemp(join(tmpdir(), "sync-destination-"));
  t.after(() => Promise.all([rm(source, { recursive: true, force: true }), rm(destination, { recursive: true, force: true })]));

  await createRepository(source);
  await mkdir(join(destination, "src"), { recursive: true });
  await mkdir(join(destination, "samples"), { recursive: true });
  await mkdir(join(destination, "scripts"), { recursive: true });
  await mkdir(join(destination, ".github"), { recursive: true });
  await writeFile(join(destination, "src", "app.mjs"), "old\n");
  await writeFile(join(destination, "config.json"), '{"custom": true}\n');
  await writeFile(join(destination, "samples", "custom.csv"), "custom\n");
  await writeFile(join(destination, "scripts", "test.mjs"), "test\n");
  await writeFile(join(destination, ".github", "workflow.yml"), "workflow\n");
  await writeFile(join(destination, "README.md"), "mirror\n");
  spawnSync("git", ["init", "--quiet"], { cwd: destination });
  spawnSync("git", ["config", "user.email", "test@example.com"], { cwd: destination });
  spawnSync("git", ["config", "user.name", "Test User"], { cwd: destination });
  spawnSync("git", ["add", "."], { cwd: destination });
  spawnSync("git", ["commit", "--quiet", "-m", "initial"], { cwd: destination });

  const first = await syncMirror(source, destination);
  spawnSync("git", ["add", "-A"], { cwd: destination });
  spawnSync("git", ["commit", "--quiet", "-m", "mirror update"], { cwd: destination });
  const second = await syncMirror(source, destination);

  assert.equal(first.changed, true);
  assert.equal(second.changed, false);
});
