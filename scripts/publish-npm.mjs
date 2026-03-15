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

import { execFileSync } from "node:child_process";
import fs from "node:fs";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const packageSpec = `${packageJson.name}@${packageJson.version}`;

function isAlreadyPublished() {
  try {
    const output = execFileSync(
      npmCommand,
      ["view", packageSpec, "version", "--json"],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    ).trim();

    return output.length > 0 && output !== "null";
  } catch {
    return false;
  }
}

if (isAlreadyPublished()) {
  console.log(`Skipping npm publish for ${packageSpec}; version already exists on npm.`);
  process.exit(0);
}

execFileSync(
  npmCommand,
  ["publish", "--access", "public", "--provenance"],
  { stdio: "inherit" },
);
