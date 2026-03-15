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
