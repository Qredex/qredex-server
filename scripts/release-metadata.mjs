/**
 *    ▄▄▄▄
 *  ▄█▀▀███▄▄              █▄
 *  ██    ██ ▄             ██
 *  ██    ██ ████▄▄█▀█▄ ▄████ █▀█▄▀██ ██▀
 *  ██  ▄ ██ ██   ██▄█▀ ██ ██ ██▄█▀  ███
 *   ▀█████▄▄█▀  ▄▀█▄▄▄█▀███▄▀█▄▄▄██ ██
 *        ▀█
 *
 *  Copyright (C) 2026 — 2026, Qredex, LTD. All Rights Reserved.
 *
 *  DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 *  Licensed under the Apache License, Version 2.0. See LICENSE for the full license text.
 *  You may not use this file except in compliance with that License.
 *  Unless required by applicable law or agreed to in writing, software distributed under the
 *  License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
 *  either express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 *
 *  If you need additional information or have any questions, please email: copyright@qredex.com
 */

import fs from "node:fs";
import { execFileSync } from "node:child_process";

const command = process.env.OTA_INPUT_COMMAND;

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function writeOutput(key, value) {
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
    return;
  }

  console.log(`${key}=${value}`);
}

function getGitValue(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function readPackageMetadata() {
  const packageJson = readJson("package.json");
  const packageLock = readJson("package-lock.json");
  const packageLockRoot = packageLock.packages?.[""] ?? {};
  const problems = [];

  if (packageLock.name !== packageJson.name) {
    problems.push(
      `package-lock.json name (${packageLock.name}) does not match package.json name (${packageJson.name}).`,
    );
  }

  if (packageLock.version !== packageJson.version) {
    problems.push(
      `package-lock.json version (${packageLock.version}) does not match package.json version (${packageJson.version}).`,
    );
  }

  if (packageLockRoot.name !== packageJson.name) {
    problems.push(
      `package-lock.json packages[\"\"] name (${packageLockRoot.name}) does not match package.json name (${packageJson.name}).`,
    );
  }

  if (packageLockRoot.version !== packageJson.version) {
    problems.push(
      `package-lock.json packages[\"\"] version (${packageLockRoot.version}) does not match package.json version (${packageJson.version}).`,
    );
  }

  if (problems.length > 0) {
    for (const problem of problems) {
      console.error(problem);
    }
    process.exit(1);
  }

  return {
    packageName: packageJson.name,
    version: packageJson.version,
    tag: `v${packageJson.version}`,
  };
}

function verifyVersionFiles() {
  const metadata = readPackageMetadata();
  writeOutput("package_name", metadata.packageName);
  writeOutput("version", metadata.version);
  writeOutput("tag", metadata.tag);
}

function resolveRelease() {
  const metadata = readPackageMetadata();
  const currentCommit = getGitValue(["rev-parse", "HEAD"]);
  let tagCommit = "";

  try {
    tagCommit = getGitValue(["rev-list", "-n", "1", metadata.tag]);
  } catch {
    tagCommit = "";
  }

  const shouldPublish = tagCommit !== "" && tagCommit === currentCommit;

  writeOutput("package_name", metadata.packageName);
  writeOutput("version", metadata.version);
  writeOutput("tag", metadata.tag);
  writeOutput("current_commit", currentCommit);
  writeOutput("tag_commit", tagCommit);
  writeOutput("should_publish", shouldPublish ? "true" : "false");

  if (!shouldPublish) {
    console.log(
      `No release tag ${metadata.tag} for commit ${currentCommit}; skipping npm publish.`,
    );
  }
}

if (command === "verify-version-files") {
  verifyVersionFiles();
} else if (command === "resolve-release") {
  resolveRelease();
} else {
  console.error("Missing OTA_INPUT_COMMAND environment variable.");
  console.error("Example: OTA_INPUT_COMMAND=resolve-release node scripts/release-metadata.mjs");
  process.exit(1);
}
