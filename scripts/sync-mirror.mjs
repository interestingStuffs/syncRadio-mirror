#!/usr/bin/env node

import { cp, mkdir, mkdtemp, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const PRESERVED_PATHS = new Set([
  "config.json",
  "samples",
  ".github",
  "scripts",
  "package.json",
  "package-lock.json"
]);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    stdio: options.stdio ?? "pipe"
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} exited with status ${result.status ?? "unknown"}\n${result.stderr || result.stdout}`);
  }

  return result.stdout;
}

async function listFiles(directory, relativeDirectory = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = join(relativeDirectory, entry.name);
    if (entry.isDirectory() && entry.name !== ".git") {
      files.push(...await listFiles(join(directory, entry.name), relativePath));
    } else if (entry.isFile()) {
      files.push(join(directory, entry.name));
    }
  }

  return files;
}

async function copyPreservedPath(source, destination, relativePath) {
  const sourcePath = join(source, relativePath);
  const destinationPath = join(destination, relativePath);
  const sourceStats = await stat(sourcePath);

  if (sourceStats.isDirectory()) {
    await mkdir(destinationPath, { recursive: true });
    const entries = await readdir(sourcePath, { withFileTypes: true });
    for (const entry of entries) {
      await copyPreservedPath(source, destination, join(relativePath, entry.name));
    }
  } else {
    await mkdir(dirname(destinationPath), { recursive: true });
    await cp(sourcePath, destinationPath);
  }
}

async function removeTrackedFiles(destination) {
  const tracked = run("git", ["ls-files", "-z"], { cwd: destination }).split("\0").filter(Boolean);

  for (const relativePath of tracked) {
    if (PRESERVED_PATHS.has(relativePath.split("/")[0])) {
      continue;
    }

    const path = join(destination, relativePath);
    const fileStats = await stat(path).catch(() => null);
    if (fileStats?.isDirectory()) {
      await rm(path, { recursive: true, force: true });
    } else {
      await rm(path, { force: true });
    }
  }
}

async function copyUpstream(source, destination) {
  const sourceFiles = await listFiles(source);

  for (const sourceFile of sourceFiles) {
    const relativePath = relative(source, sourceFile);
    if (PRESERVED_PATHS.has(relativePath.split("/")[0])) {
      continue;
    }

    const destinationFile = join(destination, relativePath);
    await mkdir(dirname(destinationFile), { recursive: true });
    await cp(sourceFile, destinationFile);
  }
}

export async function syncMirror(sourceDirectory, destinationDirectory) {
  const source = resolve(sourceDirectory);
  const destination = resolve(destinationDirectory);
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "syncRadio-mirror-"));

  try {
    await mkdir(destination, { recursive: true });
    await copyUpstream(source, temporaryDirectory);

    for (const relativePath of PRESERVED_PATHS) {
      try {
        await copyPreservedPath(destination, temporaryDirectory, relativePath);
      } catch (error) {
        if (error.code !== "ENOENT") {
          throw error;
        }
      }
    }

    await removeTrackedFiles(destination);
    await cp(temporaryDirectory, destination, { recursive: true, force: true });

    const changed = run("git", ["status", "--porcelain", "-z"], { cwd: destination });
    return {
      changed: changed.length > 0,
      changedFiles: changed.split("\0").filter(Boolean)
    };
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

async function main() {
  const sourceArg = process.argv[2] ?? process.env.SYNC_RADIO_SOURCE ?? ".";
  const destinationArg = process.argv[3] ?? process.cwd();
  const result = await syncMirror(sourceArg, destinationArg);

  if (result.changed) {
    console.log("Mirror aggiornato:");
    for (const file of result.changedFiles) {
      console.log(`- ${file.replace(/^.. /, "")}`);
    }
  } else {
    console.log("Mirror già aggiornato: nessun cambiamento.");
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
