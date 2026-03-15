/**
 *    ▄▄▄▄
 *  ▄█▀▀███▄▄              █▄
 *  ██    ██ ▄             ██
 *  ██    ██ ████▄▄█▀█▄ ▄████ ▄█▀█▄▀██ ██▀
 *  ██  ▄ ██ ██   ██▄█▀ ██ ██ ██▄█▀  ███
 *   ▀█████▄▄█▀  ▄▀█▄▄▄▄█▀███▄▀█▄▄▄▄██ ██▄
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

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const rootDir = process.cwd();
const require = createRequire(import.meta.url);

function runNpmPackDryRun() {
  const output = execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], {
    cwd: rootDir,
    encoding: "utf8",
  });
  const result = JSON.parse(output);

  assert.ok(Array.isArray(result) && result.length > 0, "npm pack --dry-run returned no package metadata.");
  return result[0];
}

async function verifyRuntimeExports() {
  const esmEntrypoint = pathToFileURL(path.join(rootDir, "dist/index.js")).href;
  const esmExports = await import(esmEntrypoint);
  const cjsExports = require(path.join(rootDir, "dist/index.cjs"));

  assert.equal(typeof esmExports.Qredex, "function", "ESM package export Qredex is missing.");
  assert.equal(typeof cjsExports.Qredex, "function", "CJS package export Qredex is missing.");
  assert.equal(
    esmExports.QredexEnvironment.PRODUCTION,
    "production",
    "ESM package export QredexEnvironment.PRODUCTION is invalid.",
  );
  assert.equal(
    cjsExports.QredexEnvironment.PRODUCTION,
    "production",
    "CJS package export QredexEnvironment.PRODUCTION is invalid.",
  );
}

function verifyPackedFiles(packResult) {
  assert.ok(Array.isArray(packResult.files), "npm pack metadata did not include a file manifest.");

  const packedFiles = new Set(
    packResult.files.map((entry) => String(entry.path)),
  );
  const requiredFiles = [
    "dist/index.js",
    "dist/index.cjs",
    "dist/index.d.ts",
    "README.md",
    "LICENSE",
    "docs/INTEGRATION_GUIDE.md",
  ];

  for (const requiredFile of requiredFiles) {
    assert.ok(
      packedFiles.has(requiredFile),
      `npm pack is missing required file '${requiredFile}'.`,
    );
  }
}

const packResult = runNpmPackDryRun();
verifyPackedFiles(packResult);
await verifyRuntimeExports();

console.log(
  `Package smoke check passed for ${packResult.name}@${packResult.version}.`,
);
